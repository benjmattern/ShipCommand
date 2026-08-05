"""Read-only VersionOne Request retrieval, paging, XML parsing, and normalization."""

from __future__ import annotations

import base64
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable


PAGE_SIZE = 100
MAX_PAGES = 100
PAGE_HELPER = Path(__file__).resolve().parent / "get-versionone-request-page.ps1"
PAGE_TIMEOUT_SECONDS = 35


class VersionOneRequestsError(Exception):
    def __init__(self, message: str, technical_detail: str, *, upstream_status: int | None = None):
        super().__init__(message)
        self.message = message
        self.technical_detail = technical_detail
        self.upstream_status = upstream_status


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def extract_value(asset: ET.Element, name: str) -> str | None:
    for child in asset:
        if local_name(child.tag) != "Attribute" or child.attrib.get("name") != name:
            continue
        value_nodes = [node for node in child if local_name(node.tag) == "Value"]
        for candidate in value_nodes or [child]:
            value = "".join(candidate.itertext()).strip()
            if value:
                return value
    return None


def parse_versionone_request_xml(xml_text: str) -> list[dict[str, Any]]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as error:
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.",
            "VersionOne returned malformed XML.",
        ) from error
    if local_name(root.tag) != "Assets":
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.",
            "VersionOne returned an unexpected XML root.",
        )

    requests: list[dict[str, Any]] = []
    for asset in root.iter():
        if local_name(asset.tag) != "Asset":
            continue
        oid = asset.attrib.get("id") or asset.attrib.get("oid") or extract_value(asset, "OID")
        if oid and not oid.lower().startswith("request:"):
            continue
        href = asset.attrib.get("href") or extract_value(asset, "Href")
        number = extract_value(asset, "Number")
        stable_id = oid or href or number
        if not stable_id:
            continue
        requests.append({
            "id": stable_id,
            "oid": oid,
            "href": href,
            "number": number,
            "name": extract_value(asset, "Name"),
            "assetState": extract_value(asset, "AssetState"),
            "status": extract_value(asset, "Status.Name"),
            "priority": extract_value(asset, "Priority.Name"),
            "ownerName": extract_value(asset, "Owner.Name"),
        })
    return requests


def retrieve_versionone_request_page(
    offset: int,
    *,
    powershell_executable: str,
    run_process: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
) -> str:
    command = [
        powershell_executable, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", str(PAGE_HELPER), "-PageSize", str(PAGE_SIZE), "-Offset", str(offset),
    ]
    try:
        completed = run_process(
            command, shell=False, capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=PAGE_TIMEOUT_SECONDS, check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.",
            "The VersionOne page request exceeded the local integration timeout.",
        ) from error
    except OSError as error:
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.",
            f"{type(error).__name__}: the controlled process could not be started.",
        ) from error
    if completed.returncode != 0:
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.",
            f"PowerShell exited with code {completed.returncode}.",
        )
    try:
        payload = json.loads(completed.stdout.strip())
        if not isinstance(payload, dict):
            raise ValueError
    except (json.JSONDecodeError, ValueError) as error:
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.",
            "PowerShell returned malformed page metadata.",
        ) from error
    if not payload.get("success"):
        upstream_status = payload.get("httpStatus")
        detail = (
            f"VersionOne returned upstream HTTP {upstream_status}."
            if isinstance(upstream_status, int)
            else "The authenticated VersionOne page request failed."
        )
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.", detail,
            upstream_status=upstream_status if isinstance(upstream_status, int) else None,
        )
    try:
        return base64.b64decode(payload["xmlBase64"], validate=True).decode("utf-8")
    except (KeyError, ValueError, UnicodeDecodeError) as error:
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.",
            "PowerShell returned invalid XML transport data.",
        ) from error


def natural_request_key(request: dict[str, Any]) -> tuple[Any, ...]:
    parts = re.split(r"(\d+)", (request["number"] or "").lower())
    number = tuple((0, int(part)) if part.isdigit() else (1, part) for part in parts)
    return number, (request["name"] or "").lower(), request["id"]


def retrieve_all_requests(*, fetch_page: Callable[[int], str]) -> dict[str, Any]:
    started_at = time.monotonic()
    requests_by_id: dict[str, dict[str, Any]] = {}
    page_count = 0
    for page_index in range(MAX_PAGES):
        page_requests = parse_versionone_request_xml(fetch_page(page_index * PAGE_SIZE))
        if not page_requests:
            break
        page_count += 1
        for request in page_requests:
            requests_by_id.setdefault(request["id"], request)
        if len(page_requests) < PAGE_SIZE:
            break
    else:
        raise VersionOneRequestsError(
            "VersionOne requests could not be retrieved.",
            f"Request paging exceeded the safety limit of {MAX_PAGES} pages.",
        )
    requests = sorted(requests_by_id.values(), key=natural_request_key)
    return {
        "recordCount": len(requests),
        "pageCount": page_count,
        "retrievedAt": utc_timestamp(),
        "durationMs": round((time.monotonic() - started_at) * 1000),
        "requests": requests,
    }
