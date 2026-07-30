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
SPEC = importlib.util.spec_from_file_location("serve_shipcommand_servicenow", SCRIPT_PATH)
assert SPEC and SPEC.loader
serve_shipcommand = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(serve_shipcommand)

CONFIGURATION = {
    "SHIPCOMMAND_SERVICENOW_BASE_URL": "https://servicenow.example.invalid",
    "SHIPCOMMAND_SERVICENOW_TEST_PATH": "/api/test",
}


def completed(payload, returncode=0):
    return subprocess.CompletedProcess(
        args=["powershell.exe"],
        returncode=returncode,
        stdout=json.dumps(payload),
        stderr="",
    )


class ServiceNowDiagnosticTests(unittest.TestCase):
    def run_payload(self, payload):
        return serve_shipcommand.run_servicenow_diagnostic(
            environ=CONFIGURATION,
            powershell_executable="powershell.exe",
            run_process=lambda *args, **kwargs: completed(payload),
        )

    def test_missing_configuration_does_not_start_powershell(self):
        called = False

        def run_process(*args, **kwargs):
            nonlocal called
            called = True

        status, result = serve_shipcommand.run_servicenow_diagnostic(
            environ={},
            run_process=run_process,
        )
        self.assertEqual(200, status)
        self.assertFalse(result["configured"])
        self.assertEqual("not-configured", result["authenticationOutcome"])
        self.assertEqual("ServiceNow is not configured.", result["message"])
        self.assertFalse(called)

    def test_controlled_process_uses_shell_false_and_fixed_helper(self):
        captured = {}

        def run_process(command, **kwargs):
            captured["command"] = command
            captured.update(kwargs)
            return completed({
                "upstreamStatus": 200,
                "contentType": "application/json",
                "responseKind": "json",
                "serviceNowDetected": True,
                "durationMs": 5,
            })

        status, result = serve_shipcommand.run_servicenow_diagnostic(
            environ=CONFIGURATION,
            powershell_executable="powershell.exe",
            run_process=run_process,
        )
        self.assertEqual(200, status)
        self.assertTrue(result["ok"])
        self.assertIs(captured["shell"], False)
        self.assertIn(str(serve_shipcommand.SERVICENOW_HELPER), captured["command"])
        self.assertIn("-RequestUrl", captured["command"])

    def test_json_and_xml_are_authenticated_responses(self):
        for response_kind, content_type in (
            ("json", "application/json"),
            ("xml", "application/xml"),
        ):
            with self.subTest(response_kind=response_kind):
                status, result = self.run_payload({
                    "upstreamStatus": 200,
                    "contentType": content_type,
                    "responseKind": response_kind,
                    "serviceNowDetected": True,
                })
                self.assertEqual(200, status)
                self.assertTrue(result["ok"])
                self.assertEqual("authenticated-response", result["authenticationOutcome"])
                self.assertEqual(response_kind, result["responseKind"])

    def test_html_login_and_redirect_classification(self):
        _, html = self.run_payload({
            "upstreamStatus": 200,
            "contentType": "text/html",
            "responseKind": "html",
        })
        self.assertEqual("html", html["responseKind"])
        self.assertEqual("unknown", html["authenticationOutcome"])

        _, login = self.run_payload({
            "upstreamStatus": 200,
            "contentType": "text/html",
            "responseKind": "html",
            "loginPageDetected": True,
        })
        self.assertEqual("login-page", login["authenticationOutcome"])
        self.assertTrue(login["loginPageDetected"])

        _, redirect = self.run_payload({
            "upstreamStatus": 302,
            "contentType": "text/html",
            "responseKind": "html",
            "redirectDetected": True,
        })
        self.assertEqual("redirect", redirect["authenticationOutcome"])
        self.assertTrue(redirect["redirectDetected"])

    def test_unauthorized_and_forbidden_detection(self):
        for upstream_status, outcome in ((401, "unauthorized"), (403, "forbidden")):
            with self.subTest(upstream_status=upstream_status):
                _, result = self.run_payload({
                    "upstreamStatus": upstream_status,
                    "responseKind": "unknown",
                })
                self.assertEqual(outcome, result["authenticationOutcome"])
                self.assertEqual("ServiceNow denied access.", result["message"])

    def test_timeout_is_sanitized_and_enforced(self):
        captured = {}

        def timeout(command, **kwargs):
            captured.update(kwargs)
            raise subprocess.TimeoutExpired(command, kwargs["timeout"])

        status, result = serve_shipcommand.run_servicenow_diagnostic(
            environ=CONFIGURATION,
            powershell_executable="powershell.exe",
            run_process=timeout,
        )
        self.assertEqual(504, status)
        self.assertEqual(serve_shipcommand.SUBPROCESS_TIMEOUT_SECONDS, captured["timeout"])
        self.assertEqual("timeout", result["authenticationOutcome"])
        self.assertNotIn("command", json.dumps(result).lower())

    def test_result_drops_raw_and_unrecognized_fields(self):
        _, result = self.run_payload({
            "upstreamStatus": 200,
            "contentType": "application/json",
            "responseKind": "json",
            "serviceNowDetected": True,
            "responseBody": '{"secret":"must not escape"}',
            "headers": {"Set-Cookie": "secret"},
            "url": "secret",
        })
        serialized = json.dumps(result)
        self.assertNotIn("responseBody", result)
        self.assertNotIn("headers", result)
        self.assertNotIn("url", result)
        self.assertNotIn("secret", serialized)


class ServiceNowApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        demo = Path(self.temporary_directory.name)
        (demo / "index.html").write_text("ShipCommand", encoding="utf-8")
        self.calls = 0

        def diagnostic():
            self.calls += 1
            return 200, serve_shipcommand.servicenow_result(
                ok=False, configured=False, duration_ms=0, upstream_status=None, content_type=None,
                response_kind="empty", authentication_outcome="not-configured",
                redirect_detected=False, login_page_detected=False, servicenow_detected=False,
                message="ServiceNow is not configured.",
            )

        self.server = serve_shipcommand.create_server(
            port=0,
            demo_directory=demo,
            diagnostic=lambda: (200, {"status": "connected"}),
            servicenow_diagnostic=diagnostic,
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://localhost:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temporary_directory.cleanup()

    def test_browser_cannot_override_endpoint_configuration(self):
        with self.assertRaises(HTTPError) as error:
            urlopen(f"{self.base_url}/api/servicenow/test?url=https://attacker.invalid")
        self.assertEqual(400, error.exception.code)
        error.exception.close()
        self.assertEqual(0, self.calls)


if __name__ == "__main__":
    unittest.main()
