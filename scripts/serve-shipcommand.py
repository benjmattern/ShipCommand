#!/usr/bin/env python3
"""ShipCommand Local Integration API — VersionOne Connectivity v1."""

from __future__ import annotations

import argparse
import json
import mimetypes
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, unquote, urlsplit

from versionone_stories import (
    DEFAULT_VERSIONONE_RELEASE,
    VersionOneStoriesError,
    retrieve_all_stories,
    retrieve_versionone_page,
    validate_release,
)


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
DEMO_DIRECTORY = REPOSITORY_ROOT / "demo"
VERSIONONE_HELPER = Path(__file__).resolve().parent / "test-versionone-connection.ps1"
LOCAL_API_PATH = "/api/versionone/test"
STORIES_API_PATH = "/api/versionone/stories"
SUBPROCESS_TIMEOUT_SECONDS = 35


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def find_powershell() -> str | None:
    if sys.platform == "win32":
        candidates = ("powershell.exe", "powershell", "pwsh.exe", "pwsh")
    else:
        candidates = ("pwsh", "powershell")
    for candidate in candidates:
        executable = shutil.which(candidate)
        if executable:
            return executable
    return None


def failed_result(
    message: str,
    technical_detail: str,
    attempted_at: str,
    duration_ms: int,
) -> dict[str, Any]:
    return {
        "status": "failed",
        "attemptedAt": attempted_at,
        "durationMs": duration_ms,
        "httpStatus": None,
        "httpStatusText": None,
        "contentType": None,
        "responseSizeBytes": None,
        "responseLooksLikeXml": None,
        "responseLooksLikeVersionOne": None,
        "message": message,
        "technicalDetail": technical_detail,
        "requestPath": "local-api",
    }


def classify_upstream_result(
    payload: dict[str, Any],
    attempted_at: str,
    fallback_duration_ms: int,
) -> dict[str, Any]:
    http_status = payload.get("httpStatus")
    looks_like_xml = payload.get("responseLooksLikeXml")
    looks_like_versionone = payload.get("responseLooksLikeVersionOne")
    looks_like_html = payload.get("responseLooksLikeHtml")
    error_category = payload.get("errorCategory")
    duration_ms = payload.get("durationMs")
    if not isinstance(duration_ms, int):
        duration_ms = fallback_duration_ms

    if error_category:
        return failed_result(
            "The local integration API could not complete the VersionOne request.",
            f"PowerShell reported a sanitized {error_category} failure.",
            attempted_at,
            duration_ms,
        )

    if http_status == 401:
        status = "warning"
        message = "VersionOne returned 401 Unauthorized when called with the current Windows credentials."
    elif http_status == 403:
        status = "warning"
        message = "VersionOne returned 403 Forbidden when called with the current Windows credentials."
    elif looks_like_html:
        status = "warning"
        message = (
            "VersionOne returned a readable response, but it appears to be HTML rather than "
            "VersionOne XML. Authentication may have redirected to a login page."
        )
    elif isinstance(http_status, int) and 200 <= http_status < 300 and looks_like_xml and looks_like_versionone:
        status = "connected"
        message = "The local integration API connected to VersionOne and received an XML response."
    elif looks_like_xml:
        status = "warning"
        message = "VersionOne returned XML, but VersionOne response indicators were inconclusive."
    elif isinstance(http_status, int):
        status = "warning"
        message = f"VersionOne returned a readable HTTP {http_status} response with an unexpected format."
    else:
        return failed_result(
            "The local integration API could not complete the VersionOne request.",
            "PowerShell returned no readable upstream response.",
            attempted_at,
            duration_ms,
        )

    return {
        "status": status,
        "attemptedAt": attempted_at,
        "durationMs": duration_ms,
        "httpStatus": http_status,
        "httpStatusText": payload.get("httpStatusText"),
        "contentType": payload.get("contentType"),
        "responseSizeBytes": payload.get("responseSizeBytes"),
        "responseLooksLikeXml": bool(looks_like_xml),
        "responseLooksLikeVersionOne": bool(looks_like_versionone),
        "message": message,
        "technicalDetail": payload.get("technicalDetail"),
        "requestPath": "local-api",
    }


def run_versionone_diagnostic(
    *,
    powershell_executable: str | None = None,
    run_process: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
) -> tuple[int, dict[str, Any]]:
    attempted_at = utc_timestamp()
    started_at = time.monotonic()
    executable = powershell_executable or find_powershell()

    if not executable:
        return 500, failed_result(
            "The local integration API could not find a supported PowerShell executable.",
            "Neither Windows PowerShell nor PowerShell Core was available.",
            attempted_at,
            0,
        )

    command = [
        executable,
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(VERSIONONE_HELPER),
        "-Release",
        DEFAULT_VERSIONONE_RELEASE,
    ]

    try:
        completed = run_process(
            command,
            shell=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=SUBPROCESS_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired:
        duration_ms = round((time.monotonic() - started_at) * 1000)
        return 502, failed_result(
            "The VersionOne request exceeded the local integration timeout.",
            f"The controlled PowerShell diagnostic exceeded {SUBPROCESS_TIMEOUT_SECONDS} seconds.",
            attempted_at,
            duration_ms,
        )
    except OSError as error:
        duration_ms = round((time.monotonic() - started_at) * 1000)
        return 500, failed_result(
            "The local integration API could not start PowerShell.",
            f"{type(error).__name__}: the controlled process could not be started.",
            attempted_at,
            duration_ms,
        )

    duration_ms = round((time.monotonic() - started_at) * 1000)
    if completed.returncode != 0:
        return 502, failed_result(
            "The local integration API could not complete the PowerShell diagnostic.",
            f"PowerShell exited with code {completed.returncode}.",
            attempted_at,
            duration_ms,
        )

    try:
        payload = json.loads(completed.stdout.strip())
        if not isinstance(payload, dict):
            raise ValueError("Expected a JSON object.")
    except (json.JSONDecodeError, ValueError):
        return 502, failed_result(
            "The local integration API received malformed diagnostic output.",
            "PowerShell did not return the expected sanitized JSON object.",
            attempted_at,
            duration_ms,
        )

    result = classify_upstream_result(payload, attempted_at, duration_ms)
    local_status = 200 if result["status"] in {"connected", "warning"} else 502
    return local_status, result


def run_versionone_stories(release: str) -> dict[str, Any]:
    executable = find_powershell()
    if not executable:
        raise VersionOneStoriesError(
            "VersionOne stories could not be retrieved.",
            "The local integration API could not find a supported PowerShell executable.",
        )
    return retrieve_all_stories(
        release,
        fetch_page=lambda validated_release, asset_type, offset: retrieve_versionone_page(
            validated_release,
            asset_type,
            offset,
            powershell_executable=executable,
        ),
    )


def create_request_handler(
    demo_directory: Path,
    diagnostic: Callable[[], tuple[int, dict[str, Any]]] = run_versionone_diagnostic,
    stories: Callable[[str], dict[str, Any]] = run_versionone_stories,
) -> type[BaseHTTPRequestHandler]:
    resolved_demo = demo_directory.resolve()

    class ShipCommandRequestHandler(BaseHTTPRequestHandler):
        server_version = "ShipCommandLocalAPI/1.0"

        def do_GET(self) -> None:  # noqa: N802
            parsed_request = urlsplit(self.path)
            request_path = parsed_request.path
            if request_path == LOCAL_API_PATH:
                self._serve_versionone_diagnostic()
                return
            if request_path == STORIES_API_PATH:
                self._serve_versionone_stories(parsed_request.query)
                return
            if request_path.startswith("/api/"):
                self._send_json(404, {"status": "failed", "message": "Local API route not found."})
                return
            self._serve_static(request_path)

        def _serve_versionone_stories(self, query_string: str) -> None:
            query = parse_qs(query_string, keep_blank_values=True)
            if any(key != "release" for key in query) or len(query.get("release", [])) > 1:
                self._send_story_error(400, DEFAULT_VERSIONONE_RELEASE, "Invalid VersionOne stories query.")
                return
            requested_release = query.get("release", [None])[0]
            try:
                release = validate_release(requested_release)
            except ValueError as error:
                self._send_story_error(400, requested_release or "", str(error))
                return
            try:
                result = stories(release)
            except VersionOneStoriesError as error:
                local_status = 504 if "timeout" in error.technical_detail.lower() else 502
                self._send_story_error(
                    local_status,
                    release,
                    error.message,
                    error.technical_detail,
                    error.upstream_status,
                )
                return
            except Exception as error:
                print(f"Story retrieval error: {type(error).__name__}", file=sys.stderr)
                self._send_story_error(
                    500,
                    release,
                    "VersionOne stories could not be retrieved.",
                    f"{type(error).__name__}; see the local server console.",
                )
                return
            self._send_json(200, result)

        def _send_story_error(
            self,
            status_code: int,
            release: str,
            message: str,
            technical_detail: str | None = None,
            upstream_status: int | None = None,
        ) -> None:
            payload = {
                "status": "failed",
                "message": message,
                "technicalDetail": technical_detail,
                "release": release,
            }
            if upstream_status is not None:
                payload["upstreamHttpStatus"] = upstream_status
            self._send_json(status_code, payload)

        def _serve_versionone_diagnostic(self) -> None:
            try:
                local_status, result = diagnostic()
            except Exception as error:  # Keep one diagnostic failure from stopping the server.
                print(f"Diagnostic error: {type(error).__name__}", file=sys.stderr)
                local_status = 500
                result = failed_result(
                    "The local integration API encountered an unexpected diagnostic failure.",
                    f"{type(error).__name__}; see the local server console.",
                    utc_timestamp(),
                    0,
                )
            self._send_json(local_status, result)

        def _serve_static(self, request_path: str) -> None:
            decoded_path = unquote(request_path)
            relative_path = "index.html" if decoded_path == "/" else decoded_path.lstrip("/")
            if "\\" in relative_path or any(part in {"", ".", ".."} for part in Path(relative_path).parts):
                self.send_error(404, "File not found")
                return

            candidate = (resolved_demo / relative_path).resolve()
            try:
                candidate.relative_to(resolved_demo)
            except ValueError:
                self.send_error(404, "File not found")
                return

            if not candidate.is_file():
                self.send_error(404, "File not found")
                return

            content = candidate.read_bytes()
            content_type, _ = mimetypes.guess_type(candidate.name)
            self.send_response(200)
            self.send_header("Content-Type", content_type or "application/octet-stream")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def _send_json(self, status_code: int, payload: dict[str, Any]) -> None:
            content = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

    return ShipCommandRequestHandler


def create_server(
    host: str = "localhost",
    port: int = 8000,
    *,
    demo_directory: Path = DEMO_DIRECTORY,
    diagnostic: Callable[[], tuple[int, dict[str, Any]]] = run_versionone_diagnostic,
    stories: Callable[[str], dict[str, Any]] = run_versionone_stories,
) -> ThreadingHTTPServer:
    if not (demo_directory / "index.html").is_file():
        raise FileNotFoundError(f"ShipCommand demo build was not found: {demo_directory}")
    return ThreadingHTTPServer((host, port), create_request_handler(demo_directory, diagnostic, stories))


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve ShipCommand and its Local Integration API.")
    parser.add_argument("--port", type=int, default=8000, help="Local HTTP port (default: 8000).")
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    try:
        server = create_server(port=arguments.port)
    except (OSError, FileNotFoundError) as error:
        print(f"Unable to start ShipCommand: {error}", file=sys.stderr)
        return 1

    print("ShipCommand Local Integration API")
    print()
    print("Serving:")
    print(DEMO_DIRECTORY)
    print()
    print("Open:")
    print(f"http://localhost:{arguments.port}")
    print()
    print("API:")
    print(f"GET {LOCAL_API_PATH}")
    print(f"GET {STORIES_API_PATH}")
    print()
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping ShipCommand Local Integration API.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
