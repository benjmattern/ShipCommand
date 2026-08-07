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
            "assert.equal(subject.detectEnvironment(), 'development'); assert.equal(subject.detectEnvironment('github-pages'), 'github-pages'); assert.equal(subject.environment, 'development');",
        )

    def test_api_base_and_existing_paths_are_unchanged(self):
        source = (CONFIG / "api.ts").read_text(encoding="utf-8")
        self.assertIn("targetEnvironment === 'github-pages' ? null : ''", source)
        self.assertIn("if (baseUrl === null) throw new EnterpriseApiUnavailableError()", source)
        self.assertIn("`${baseUrl}${path}`", source)

    def test_all_existing_features_remain_enabled(self):
        source = (CONFIG / "features.ts").read_text(encoding="utf-8")
        self.assertIn("return targetEnvironment !== 'github-pages'", source)
        for helper in (
            "isEnterpriseEnabled", "isVersionOneEnabled", "isServiceNowEnabled",
            "isAlmEnabled", "isDiagnosticsEnabled",
        ):
            self.assertIn(f"export function {helper}", source)
            self.assertIn("return hasLocalIntegration(targetEnvironment)", source)

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
            "src/diagnostics/sharePointDiagnostics.ts": "/api/sharepoint/test",
        }
        for relative_path, expected_path in call_sites.items():
            with self.subTest(relative_path=relative_path):
                source = (ROOT / relative_path).read_text(encoding="utf-8")
                self.assertIn("getApiUrl", source)
                self.assertIn(expected_path, source)
        serialized = json.dumps(call_sites)
        self.assertNotIn("token", serialized.lower())

    def test_api_resolution_only_occurs_when_enterprise_requests_run(self):
        request_modules = {
            "src/versionone/versionOneApi.ts": "export async function loadVersionOneStories",
            "src/versionone/versionOneRequestApi.ts": "export async function loadVersionOneRequests",
            "src/diagnostics/versionOneDiagnostics.ts": "export async function runVersionOneConnectionTest",
            "src/diagnostics/serviceNowDiagnostics.ts": "export async function runServiceNowConnectionTest",
            "src/diagnostics/sharePointDiagnostics.ts": "export async function runSharePointConnectionTest",
        }
        for relative_path, request_function in request_modules.items():
            with self.subTest(relative_path=relative_path):
                source = (ROOT / relative_path).read_text(encoding="utf-8")
                function_start = source.index(request_function)
                self.assertNotIn("getApiUrl(", source[:function_start])
                self.assertIn("getApiUrl(", source[function_start:])

        api_source = (CONFIG / "api.ts").read_text(encoding="utf-8")
        self.assertNotIn("getApiUrl(", api_source[:api_source.index("export function getApiUrl")])
        self.assertIn("throw new EnterpriseApiUnavailableError()", api_source)

    def test_pages_startup_configuration_is_non_throwing(self):
        index_source = (CONFIG / "index.ts").read_text(encoding="utf-8")
        config_initializer = index_source[index_source.index("export const applicationConfig"):]
        self.assertNotIn("getApiUrl(", config_initializer)
        self.assertIn("apiBaseUrl: getApiBaseUrl()", config_initializer)

        api_source = (CONFIG / "api.ts").read_text(encoding="utf-8")
        self.assertIn("targetEnvironment === 'github-pages' ? null : ''", api_source)
        self.assertIn("if (baseUrl === null) throw new EnterpriseApiUnavailableError()", api_source)

    def test_pages_build_and_workflow_contracts(self):
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertEqual("tsc && vite build", package["scripts"]["build"])
        self.assertEqual("tsc && vite build --mode github-pages", package["scripts"]["build:pages"])

        vite = (ROOT / "vite.config.ts").read_text(encoding="utf-8")
        self.assertIn("mode === 'github-pages' ? '/ShipCommand/' : '/'", vite)

        workflow = (ROOT / ".github" / "workflows" / "deploy-pages.yml").read_text(encoding="utf-8")
        for expected in (
            "branches: [main]", "workflow_dispatch:", "runs-on: ubuntu-latest",
            "contents: read", "pages: write", "id-token: write",
            "environment:", "name: github-pages", "npm ci",
            "npm run build:pages", "actions/configure-pages@",
            "actions/upload-pages-artifact@", "path: ./dist", "actions/deploy-pages@",
        ):
            self.assertIn(expected, workflow)
        self.assertNotIn("peaceiris", workflow.lower())
        self.assertNotIn("gh-pages", workflow.lower())

    def test_static_pages_notice_keeps_navigation_without_api_fetches(self):
        app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        notice = (ROOT / "src" / "EnterpriseUnavailableNotice.tsx").read_text(encoding="utf-8")
        for label in ("Diagnostics", "VersionOne", "VersionOne Requests"):
            self.assertIn(label, app)
        self.assertIn("applicationConfig.versionOneEnabled", app)
        self.assertIn("applicationConfig.diagnosticsEnabled", app)
        self.assertIn("Live enterprise data is unavailable in the GitHub Pages build.", notice)
        self.assertIn("local integration server", notice)
        self.assertNotIn("fetch(", notice)


if __name__ == "__main__":
    unittest.main()
