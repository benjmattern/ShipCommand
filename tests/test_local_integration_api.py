import importlib.util
import json
import subprocess
import tempfile
import threading
import unittest
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "serve-shipcommand.py"
sys.path.insert(0, str(SCRIPT_PATH.parent))
SPEC = importlib.util.spec_from_file_location("serve_shipcommand", SCRIPT_PATH)
assert SPEC and SPEC.loader
serve_shipcommand = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(serve_shipcommand)


def completed(payload, returncode=0):
    return subprocess.CompletedProcess(
        args=["powershell.exe"],
        returncode=returncode,
        stdout=json.dumps(payload),
        stderr="",
    )


class DiagnosticClassificationTests(unittest.TestCase):
    def run_payload(self, payload):
        return serve_shipcommand.run_versionone_diagnostic(
            powershell_executable="powershell.exe",
            run_process=lambda *args, **kwargs: completed(payload),
        )

    def test_repository_and_demo_paths_resolve_from_script(self):
        self.assertEqual(SCRIPT_PATH.parents[1], serve_shipcommand.REPOSITORY_ROOT)
        self.assertEqual(serve_shipcommand.REPOSITORY_ROOT / "demo", serve_shipcommand.DEMO_DIRECTORY)

    def test_connected_result_is_sanitized(self):
        local_status, result = self.run_payload({
            "httpStatus": 200,
            "httpStatusText": "OK",
            "contentType": "application/xml",
            "responseSizeBytes": 2048,
            "responseLooksLikeXml": True,
            "responseLooksLikeVersionOne": True,
            "responseLooksLikeHtml": False,
            "durationMs": 25,
            "storyName": "must not be copied",
            "responseBody": "<Assets>must not be copied</Assets>",
        })
        self.assertEqual(200, local_status)
        self.assertEqual("connected", result["status"])
        self.assertEqual("local-api", result["requestPath"])
        self.assertNotIn("responseBody", result)
        self.assertNotIn("storyName", result)
        self.assertNotIn("Assets", json.dumps(result))

    def test_html_response_is_warning(self):
        local_status, result = self.run_payload({
            "httpStatus": 200,
            "contentType": "text/html",
            "responseSizeBytes": 100,
            "responseLooksLikeXml": False,
            "responseLooksLikeVersionOne": False,
            "responseLooksLikeHtml": True,
        })
        self.assertEqual(200, local_status)
        self.assertEqual("warning", result["status"])
        self.assertIn("HTML", result["message"])

    def test_401_and_403_are_warnings(self):
        for upstream_status in (401, 403):
            with self.subTest(upstream_status=upstream_status):
                local_status, result = self.run_payload({
                    "httpStatus": upstream_status,
                    "responseLooksLikeXml": False,
                    "responseLooksLikeVersionOne": False,
                    "responseLooksLikeHtml": False,
                })
                self.assertEqual(200, local_status)
                self.assertEqual("warning", result["status"])
                self.assertIn(str(upstream_status), result["message"])

    def test_timeout_is_failed(self):
        def timeout(*args, **kwargs):
            raise subprocess.TimeoutExpired(cmd="powershell.exe", timeout=35)

        local_status, result = serve_shipcommand.run_versionone_diagnostic(
            powershell_executable="powershell.exe",
            run_process=timeout,
        )
        self.assertEqual(502, local_status)
        self.assertEqual("failed", result["status"])
        self.assertIn("timeout", result["message"])

    def test_malformed_output_is_failed(self):
        local_status, result = serve_shipcommand.run_versionone_diagnostic(
            powershell_executable="powershell.exe",
            run_process=lambda *args, **kwargs: completed("not-json"),
        )
        self.assertEqual(502, local_status)
        self.assertEqual("failed", result["status"])
        self.assertIn("malformed", result["message"])

    def test_powershell_unavailable_is_failed(self):
        with patch.object(serve_shipcommand, "find_powershell", return_value=None):
            local_status, result = serve_shipcommand.run_versionone_diagnostic()
        self.assertEqual(500, local_status)
        self.assertEqual("failed", result["status"])
        self.assertIn("PowerShell", result["message"])

    def test_keyboard_interrupt_closes_server_cleanly(self):
        class FakeServer:
            closed = False

            def serve_forever(self):
                raise KeyboardInterrupt

            def server_close(self):
                self.closed = True

        fake_server = FakeServer()
        arguments = type("Arguments", (), {"port": 8000})()
        with patch.object(serve_shipcommand, "parse_arguments", return_value=arguments):
            with patch.object(serve_shipcommand, "create_server", return_value=fake_server):
                self.assertEqual(0, serve_shipcommand.main())
        self.assertTrue(fake_server.closed)


class StaticAndApiServerTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.demo = Path(self.temporary_directory.name)
        (self.demo / "assets").mkdir()
        (self.demo / "index.html").write_text("<html>ShipCommand</html>", encoding="utf-8")
        (self.demo / "assets" / "app.js").write_text("console.log('ok')", encoding="utf-8")

        self.api_calls = 0

        def failed_diagnostic():
            self.api_calls += 1
            return 502, serve_shipcommand.failed_result(
                "Enterprise request failed safely.",
                "Mock transport failure.",
                "2026-07-29T18:38:19.000Z",
                5,
            )

        self.server = serve_shipcommand.create_server(
            port=0,
            demo_directory=self.demo,
            diagnostic=failed_diagnostic,
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://localhost:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temporary_directory.cleanup()

    def test_root_and_static_asset_are_served(self):
        with urlopen(f"{self.base_url}/") as response:
            self.assertEqual(200, response.status)
            self.assertIn(b"ShipCommand", response.read())
        with urlopen(f"{self.base_url}/assets/app.js") as response:
            self.assertEqual(200, response.status)
            self.assertIn("javascript", response.headers["Content-Type"])

    def test_missing_asset_and_path_traversal_are_blocked(self):
        for path in ("/missing.js", "/%2e%2e/package.json"):
            with self.subTest(path=path):
                with self.assertRaises(HTTPError) as error:
                    urlopen(f"{self.base_url}{path}")
                self.assertEqual(404, error.exception.code)
                error.exception.close()

    def test_api_returns_json_and_server_survives_failure(self):
        for expected_call_count in (1, 2):
            with self.subTest(expected_call_count=expected_call_count):
                with self.assertRaises(HTTPError) as error:
                    urlopen(f"{self.base_url}/api/versionone/test")
                self.assertEqual(502, error.exception.code)
                payload = json.loads(error.exception.read())
                self.assertEqual("application/json; charset=utf-8", error.exception.headers["Content-Type"])
                self.assertEqual("failed", payload["status"])
                self.assertNotIn("responseBody", payload)
                self.assertEqual(expected_call_count, self.api_calls)
                error.exception.close()

    def test_unknown_api_route_returns_json_404(self):
        with self.assertRaises(HTTPError) as error:
            urlopen(f"{self.base_url}/api/unknown")
        self.assertEqual(404, error.exception.code)
        self.assertEqual("application/json; charset=utf-8", error.exception.headers["Content-Type"])
        error.exception.close()


if __name__ == "__main__":
    unittest.main()
