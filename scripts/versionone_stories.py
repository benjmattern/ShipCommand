"""VersionOne Story and Defect retrieval, paging, XML parsing, and normalization."""

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


DEFAULT_VERSIONONE_RELEASE = "29.0.0.0"
RELEASE_PATTERN = re.compile(r"^\d+\.\d+\.\d+\.\d+$")
PAGE_SIZE = 100
MAX_PAGES = 100
ASSET_TYPES = ("Story", "Defect")
PAGE_HELPER = Path(__file__).resolve().parent / "get-versionone-page.ps1"
PAGE_TIMEOUT_SECONDS = 35


class VersionOneStoriesError(Exception):
    def __init__(self, message: str, technical_detail: str, *, upstream_status: int | None = None):
        super().__init__(message)
        self.message = message
        self.technical_detail = technical_detail
        self.upstream_status = upstream_status


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def validate_release(value: str | None) -> str:
    release = DEFAULT_VERSIONONE_RELEASE if value is None else value
    if len(release) > 64 or not RELEASE_PATTERN.fullmatch(release):
        raise ValueError("Release must use four numeric dot-separated segments.")
    return release


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def attribute_elements(asset: ET.Element, name: str) -> list[ET.Element]:
    return [
        child for child in asset
        if local_name(child.tag) == "Attribute" and child.attrib.get("name") == name
    ]


def extract_values(asset: ET.Element, name: str) -> list[str]:
    values: list[str] = []
    for attribute in attribute_elements(asset, name):
        value_nodes = [node for node in attribute if local_name(node.tag) == "Value"]
        candidates = value_nodes or [attribute]
        for candidate in candidates:
            value = "".join(candidate.itertext()).strip()
            if value and value not in values:
                values.append(value)
    return values


def extract_value(asset: ET.Element, name: str) -> str | None:
    values = extract_values(asset, name)
    return values[0] if values else None


def classify_record_type(number: str | None) -> str:
    normalized_number = (number or "").lower()
    if normalized_number.startswith("b-"):
        return "story"
    if normalized_number.startswith("d-"):
        return "defect"
    return "other"


def parse_versionone_story_xml(xml_text: str) -> list[dict[str, Any]]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as error:
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            "VersionOne returned malformed XML.",
        ) from error

    if local_name(root.tag) != "Assets":
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            "VersionOne returned an unexpected XML root.",
        )

    stories: list[dict[str, Any]] = []
    for asset in root.iter():
        if local_name(asset.tag) != "Asset":
            continue
        oid = asset.attrib.get("id") or asset.attrib.get("oid") or extract_value(asset, "OID")
        if oid and not oid.lower().startswith(("story:", "defect:")):
            continue
        href = asset.attrib.get("href") or extract_value(asset, "Href")
        number = extract_value(asset, "Number")
        stable_id = oid or href or number
        if not stable_id:
            continue
        stories.append({
            "id": stable_id,
            "oid": oid,
            "href": href,
            "number": number,
            "recordType": classify_record_type(number),
            "name": extract_value(asset, "Name") or "",
            "assetState": extract_value(asset, "AssetState"),
            "status": extract_value(asset, "Status.Name"),
            "releaseName": extract_value(asset, "Scope.Name"),
            "teamName": extract_value(asset, "Team.Name"),
            "ownerNames": extract_values(asset, "Owners.Name"),
        })
    return stories


def retrieve_versionone_page(
    release: str,
    asset_type: str,
    offset: int,
    *,
    powershell_executable: str,
    run_process: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
) -> str:
    if asset_type not in ASSET_TYPES:
        raise ValueError("Unsupported VersionOne asset type.")
    command = [
        powershell_executable,
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(PAGE_HELPER),
        "-AssetType",
        asset_type,
        "-Release",
        release,
        "-PageSize",
        str(PAGE_SIZE),
        "-Offset",
        str(offset),
    ]
    try:
        completed = run_process(
            command,
            shell=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=PAGE_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            "The VersionOne page request exceeded the local integration timeout.",
        ) from error
    except OSError as error:
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            f"{type(error).__name__}: the controlled process could not be started.",
        ) from error

    if completed.returncode != 0:
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            f"PowerShell exited with code {completed.returncode}.",
        )
    try:
        payload = json.loads(completed.stdout.strip())
        if not isinstance(payload, dict):
            raise ValueError
    except (json.JSONDecodeError, ValueError) as error:
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            "PowerShell returned malformed page metadata.",
        ) from error

    if not payload.get("success"):
        upstream_status = payload.get("httpStatus")
        detail = (
            f"VersionOne returned upstream HTTP {upstream_status}."
            if isinstance(upstream_status, int)
            else "The authenticated VersionOne page request failed."
        )
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            detail,
            upstream_status=upstream_status if isinstance(upstream_status, int) else None,
        )
    try:
        return base64.b64decode(payload["xmlBase64"], validate=True).decode("utf-8")
    except (KeyError, ValueError, UnicodeDecodeError) as error:
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            "PowerShell returned invalid XML transport data.",
        ) from error


def retrieve_all_stories(
    release: str,
    *,
    fetch_page: Callable[[str, str, int], str],
) -> dict[str, Any]:
    release = validate_release(release)
    started_at = time.monotonic()
    stories_by_id: dict[str, dict[str, Any]] = {}
    page_count = 0

    for asset_type in ASSET_TYPES:
        for page_index in range(MAX_PAGES):
            offset = page_index * PAGE_SIZE
            page_stories = parse_versionone_story_xml(fetch_page(release, asset_type, offset))
            if not page_stories:
                break
            page_count += 1
            for story in page_stories:
                stories_by_id.setdefault(story["id"], story)
            if len(page_stories) < PAGE_SIZE:
                break
        else:
            raise VersionOneStoriesError(
                "VersionOne stories could not be retrieved.",
                f"{asset_type} paging exceeded the safety limit of {MAX_PAGES} pages.",
            )

    def natural_record_key(story: dict[str, Any]) -> tuple[Any, ...]:
        number_parts = re.split(r"(\d+)", (story["number"] or "").lower())
        natural_number = tuple(
            (0, int(part)) if part.isdigit() else (1, part)
            for part in number_parts
        )
        return natural_number, story["name"].lower(), story["id"]

    stories = sorted(
        stories_by_id.values(),
        key=natural_record_key,
    )
    story_count = sum(story["recordType"] == "story" for story in stories)
    defect_count = sum(story["recordType"] == "defect" for story in stories)
    other_count = len(stories) - story_count - defect_count
    return {
        "release": release,
        "recordCount": len(stories),
        "storyCount": story_count,
        "defectCount": defect_count,
        "otherCount": other_count,
        "pageCount": page_count,
        "retrievedAt": utc_timestamp(),
        "durationMs": round((time.monotonic() - started_at) * 1000),
        "stories": stories,
    }
