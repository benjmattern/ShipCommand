import importlib.util
import json
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "serve-shipcommand.py"
sys.path.insert(0, str(SCRIPT_PATH.parent))
SPEC = importlib.util.spec_from_file_location("serve_shipcommand_sharepoint", SCRIPT_PATH)
assert SPEC and SPEC.loader
serve_shipcommand = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(serve_shipcommand)

CONFIGURATION = {"SHIPCOMMAND_SHAREPOINT_TEST_URL": "https://sharepoint.example.invalid/personal/test/Lists/Ship"}


def completed(payload, returncode=0, stderr=""):
    return subprocess.CompletedProcess(
        args=["powershell.exe"], returncode=returncode,
        stdout=json.dumps(payload), stderr=stderr,
    )


class SharePointDiagnosticTests(unittest.TestCase):
    def run_payload(self, payload):
        return serve_shipcommand.run_sharepoint_diagnostic(
            environ=CONFIGURATION,
            powershell_executable="powershell.exe",
            run_process=lambda *args, **kwargs: completed(payload),
        )

    def test_missing_configuration_does_not_start_powershell(self):
        called = False

        def run_process(*args, **kwargs):
            nonlocal called
            called = True

        status, result = serve_shipcommand.run_sharepoint_diagnostic(environ={}, run_process=run_process)
        self.assertEqual(200, status)
        self.assertFalse(result["configured"])
        self.assertEqual("not-configured", result["authenticationOutcome"])
        self.assertFalse(called)

    def test_valid_configuration_uses_fixed_helper_shell_false_and_timeout(self):
        captured = {}

        def run_process(command, **kwargs):
            captured["command"] = command
            captured.update(kwargs)
            return completed({
                "upstreamStatus": 200, "contentType": "application/json",
                "responseKind": "json", "sharePointDetected": True, "durationMs": 7,
            })

        status, result = serve_shipcommand.run_sharepoint_diagnostic(
            environ=CONFIGURATION, powershell_executable="powershell.exe", run_process=run_process,
        )
        self.assertEqual(200, status)
        self.assertTrue(result["ok"])
        self.assertIs(captured["shell"], False)
        self.assertEqual(serve_shipcommand.SUBPROCESS_TIMEOUT_SECONDS, captured["timeout"])
        self.assertIn(str(serve_shipcommand.SHAREPOINT_HELPER), captured["command"])
        self.assertIn("-RequestUrl", captured["command"])

    def test_invalid_urls_are_rejected_without_process_start(self):
        invalid_urls = (
            "http://sharepoint.example.invalid/list",
            "https://user:password@sharepoint.example.invalid/list",
            "https://sharepoint.example.invalid/list#fragment",
            "https://sharepoint.example.invalid/list?access_token=temporary",
            "https://sharepoint.example.invalid/list\nheader",
            "https://sharepoint.example.invalid/" + "a" * 2050,
        )
        for request_url in invalid_urls:
            with self.subTest(request_url=request_url[:50]):
                called = False

                def run_process(*args, **kwargs):
                    nonlocal called
                    called = True

                status, result = serve_shipcommand.run_sharepoint_diagnostic(
                    environ={"SHIPCOMMAND_SHAREPOINT_TEST_URL": request_url}, run_process=run_process,
                )
                self.assertEqual(500, status)
                self.assertEqual("not-configured", result["authenticationOutcome"])
                self.assertFalse(called)

    def test_readable_response_kinds_and_html_are_classified(self):
        for response_kind, content_type in (
            ("json", "application/json"), ("xml", "application/xml"),
            ("html", "text/html"), ("empty", None),
        ):
            with self.subTest(response_kind=response_kind):
                _, result = self.run_payload({
                    "upstreamStatus": 200, "contentType": content_type,
                    "responseKind": response_kind, "sharePointDetected": response_kind != "empty",
                })
                self.assertEqual("authenticated-response", result["authenticationOutcome"])
                self.assertEqual(response_kind, result["responseKind"])

    def test_login_page_and_redirect_are_not_authenticated(self):
        _, login = self.run_payload({
            "upstreamStatus": 200, "contentType": "text/html", "responseKind": "html",
            "loginPageDetected": True, "sharePointDetected": True,
        })
        self.assertEqual("login-page", login["authenticationOutcome"])
        _, redirect = self.run_payload({
            "upstreamStatus": 302, "contentType": "text/html", "responseKind": "html",
            "redirectDetected": True,
        })
        self.assertEqual("redirect", redirect["authenticationOutcome"])

    def test_unauthorized_forbidden_and_transport_failure(self):
        for upstream_status, outcome in ((401, "unauthorized"), (403, "forbidden")):
            with self.subTest(upstream_status=upstream_status):
                _, result = self.run_payload({"upstreamStatus": upstream_status, "responseKind": "unknown"})
                self.assertEqual(outcome, result["authenticationOutcome"])
        _, transport = self.run_payload({"responseKind": "unknown", "errorCategory": "transport"})
        self.assertEqual("unreachable", transport["authenticationOutcome"])

    def test_timeout_is_sanitized(self):
        def timeout(command, **kwargs):
            raise subprocess.TimeoutExpired(command, kwargs["timeout"], output="private response")

        status, result = serve_shipcommand.run_sharepoint_diagnostic(
            environ=CONFIGURATION, powershell_executable="powershell.exe", run_process=timeout,
        )
        self.assertEqual(504, status)
        self.assertEqual("timeout", result["authenticationOutcome"])
        self.assertNotIn("private", json.dumps(result))

    def test_failures_and_results_do_not_leak_process_or_upstream_data(self):
        secret_url = CONFIGURATION["SHIPCOMMAND_SHAREPOINT_TEST_URL"]
        for process_result in (
            completed({}, returncode=1, stderr=f"token password {secret_url}"),
            subprocess.CompletedProcess(args=[], returncode=0, stdout="not json", stderr=secret_url),
        ):
            _, result = serve_shipcommand.run_sharepoint_diagnostic(
                environ=CONFIGURATION, powershell_executable="powershell.exe",
                run_process=lambda *args, value=process_result, **kwargs: value,
            )
            serialized = json.dumps(result).lower()
            for forbidden in ("token", "password", secret_url.lower(), "stderr", "command"):
                self.assertNotIn(forbidden, serialized)

        _, result = self.run_payload({
            "upstreamStatus": 200, "contentType": "application/json", "responseKind": "json",
            "sharePointDetected": True, "responseBody": "private list content",
            "headers": {"Set-Cookie": "secret"}, "url": secret_url, "token": "secret",
        })
        serialized = json.dumps(result).lower()
        for forbidden in ("private", "cookie", secret_url.lower(), "token", "secret"):
            self.assertNotIn(forbidden, serialized)


class SharePointApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        demo = Path(self.temporary_directory.name)
        (demo / "index.html").write_text("ShipCommand", encoding="utf-8")
        self.calls = 0

        def diagnostic():
            self.calls += 1
            if self.calls == 1:
                raise RuntimeError("sensitive failure")
            return 200, serve_shipcommand.sharepoint_result(
                ok=False, configured=False, duration_ms=0, upstream_status=None, content_type=None,
                response_kind="empty", authentication_outcome="not-configured",
                redirect_detected=False, login_page_detected=False, sharepoint_detected=False,
                message="SharePoint is not configured.",
            )

        self.server = serve_shipcommand.create_server(
            port=0, demo_directory=demo,
            diagnostic=lambda: (200, {"status": "connected"}),
            sharepoint_diagnostic=diagnostic,
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://localhost:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temporary_directory.cleanup()

    def test_query_parameters_are_rejected(self):
        with self.assertRaises(HTTPError) as error:
            urlopen(f"{self.base_url}/api/sharepoint/test?url=https://attacker.invalid")
        self.assertEqual(400, error.exception.code)
        error.exception.close()
        self.assertEqual(0, self.calls)

    def test_server_remains_operational_after_failure(self):
        with self.assertRaises(HTTPError) as error:
            urlopen(f"{self.base_url}/api/sharepoint/test")
        self.assertEqual(500, error.exception.code)
        body = error.exception.read().decode("utf-8")
        error.exception.close()
        self.assertNotIn("sensitive failure", body)
        with urlopen(f"{self.base_url}/api/sharepoint/test") as response:
            payload = json.load(response)
        self.assertEqual("not-configured", payload["authenticationOutcome"])
        self.assertEqual(2, self.calls)


if __name__ == "__main__":
    unittest.main()
