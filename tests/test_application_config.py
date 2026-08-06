import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "src" / "config"


class ApplicationConfigurationTests(unittest.TestCase):
    def run_typescript_module(self, module_name, assertions):
        module = (CONFIG / module_name).as_uri()
        script = f"""
          import assert from 'node:assert/strict';
          import * as subject from '{module}';
          {assertions}
        """
        completed = subprocess.run(
            ["node", "--experimental-strip-types", "--input-type=module", "--eval", script],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        self.assertEqual(0, completed.returncode, completed.stderr)

    def test_environment_defaults_to_development(self):
        self.run_typescript_module(
            "environment.ts",
            "assert.equal(subject.detectEnvironment(), 'development'); assert.equal(subject.environment, 'development');",
        )

    def test_api_base_and_existing_paths_are_unchanged(self):
        self.run_typescript_module(
            "api.ts",
            """
              assert.equal(subject.getApiBaseUrl(), '');
              assert.equal(subject.getApiUrl('/api/versionone/test'), '/api/versionone/test');
              assert.equal(subject.getApiUrl('/api/versionone/stories'), '/api/versionone/stories');
              assert.equal(subject.getApiUrl('/api/versionone/requests'), '/api/versionone/requests');
              assert.equal(subject.getApiUrl('/api/servicenow/test'), '/api/servicenow/test');
            """,
        )

    def test_all_existing_features_remain_enabled(self):
        self.run_typescript_module(
            "features.ts",
            """
              assert.equal(subject.isEnterpriseEnabled(), true);
              assert.equal(subject.isVersionOneEnabled(), true);
              assert.equal(subject.isServiceNowEnabled(), true);
              assert.equal(subject.isAlmEnabled(), true);
              assert.equal(subject.isDiagnosticsEnabled(), true);
            """,
        )

    def test_readonly_configuration_exposes_required_shape(self):
        source = (CONFIG / "index.ts").read_text(encoding="utf-8")
        self.assertIn("Object.freeze", source)
        for property_name in (
            "environment", "apiBaseUrl", "enterpriseEnabled", "versionOneEnabled",
            "serviceNowEnabled", "almEnabled", "diagnosticsEnabled",
        ):
            self.assertIn(property_name, source)
        self.assertNotIn("localStorage", source)
        self.assertNotIn("sessionStorage", source)

    def test_all_enterprise_browser_paths_use_central_api_resolution(self):
        call_sites = {
            "src/versionone/versionOneApi.ts": "/api/versionone/stories",
            "src/versionone/versionOneRequestApi.ts": "/api/versionone/requests",
            "src/diagnostics/versionOneDiagnostics.ts": "/api/versionone/test",
            "src/diagnostics/serviceNowDiagnostics.ts": "/api/servicenow/test",
        }
        for relative_path, expected_path in call_sites.items():
            with self.subTest(relative_path=relative_path):
                source = (ROOT / relative_path).read_text(encoding="utf-8")
                self.assertIn("getApiUrl", source)
                self.assertIn(expected_path, source)
        serialized = json.dumps(call_sites)
        self.assertNotIn("token", serialized.lower())


if __name__ == "__main__":
    unittest.main()
