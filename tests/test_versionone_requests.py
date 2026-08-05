import base64
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


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from versionone_requests import (  # noqa: E402
    MAX_PAGES,
    PAGE_SIZE,
    VersionOneRequestsError,
    natural_request_key,
    parse_versionone_request_xml,
    retrieve_all_requests,
    retrieve_versionone_request_page,
)

SPEC = importlib.util.spec_from_file_location("serve_shipcommand_requests", SCRIPTS / "serve-shipcommand.py")
assert SPEC and SPEC.loader
serve_shipcommand = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(serve_shipcommand)


def request_asset(index, *, oid=True, href=True, number=True, namespace_values=False):
    value = (lambda text: f"<Value>{text}</Value>") if namespace_values else (lambda text: text)
    attributes = [f'<Attribute name="Name">{value(f"Request {index}")}</Attribute>']
    if number:
        attributes.append(f'<Attribute name="Number">{value(f"R-{index}")}</Attribute>')
    attributes.extend([
        f'<Attribute name="AssetState">{value("Active")}</Attribute>',
        f'<Attribute name="Status.Name">{value("Open")}</Attribute>',
        f'<Attribute name="Priority.Name">{value("High")}</Attribute>',
        f'<Attribute name="Owner.Name">{value("Owner One")}</Attribute>',
    ])
    identity = f' id="Request:{index}"' if oid else ""
    link = f' href="https://versionone.usps.gov/Request/{index}"' if href else ""
    return f"<Asset{identity}{link}>{''.join(attributes)}</Asset>"


def assets_xml(assets, namespace=None):
    ns = f' xmlns="{namespace}"' if namespace else ""
    return f"<Assets{ns}>{''.join(assets)}</Assets>"


class RequestXmlTests(unittest.TestCase):
    def test_normalizes_all_request_fields(self):
        request = parse_versionone_request_xml(assets_xml([request_asset(2)]))[0]
        self.assertEqual({
            "id": "Request:2",
            "oid": "Request:2",
            "href": "https://versionone.usps.gov/Request/2",
            "number": "R-2",
            "name": "Request 2",
            "assetState": "Active",
            "status": "Open",
            "priority": "High",
            "ownerName": "Owner One",
        }, request)

    def test_missing_fields_are_null(self):
        request = parse_versionone_request_xml(
            "<Assets><Asset id='Request:1'><Attribute name='Name'/></Asset></Assets>"
        )[0]
        for field in ("href", "number", "name", "assetState", "status", "priority", "ownerName"):
            self.assertIsNone(request[field])

    def test_namespace_safe_value_nodes_and_multiple_assets(self):
        requests = parse_versionone_request_xml(assets_xml(
            [request_asset(1, namespace_values=True), request_asset(2, namespace_values=True)], "urn:test"
        ))
        self.assertEqual(["R-1", "R-2"], [request["number"] for request in requests])

    def test_stable_identity_prefers_oid_then_href_then_number(self):
        xml = assets_xml([
            request_asset(1),
            request_asset(2, oid=False),
            request_asset(3, oid=False, href=False),
        ])
        self.assertEqual([
            "Request:1", "https://versionone.usps.gov/Request/2", "R-3",
        ], [request["id"] for request in parse_versionone_request_xml(xml)])

    def test_assets_without_identity_and_non_requests_are_ignored(self):
        xml = "<Assets><Asset><Attribute name='Name'>No identity</Attribute></Asset><Asset id='Story:1'/></Assets>"
        self.assertEqual([], parse_versionone_request_xml(xml))

    def test_malformed_and_unexpected_xml_are_sanitized(self):
        for xml in ("<Assets>", "<Asset id='Request:1'/>"):
            with self.subTest(xml=xml), self.assertRaises(VersionOneRequestsError) as error:
                parse_versionone_request_xml(xml)
            self.assertNotIn(xml, error.exception.technical_detail)


class RequestPagingTests(unittest.TestCase):
    def page(self, start, count):
        return assets_xml([request_asset(index) for index in range(start, start + count)])

    def test_partial_page_stops(self):
        offsets = []
        result = retrieve_all_requests(fetch_page=lambda offset: offsets.append(offset) or self.page(1, 2))
        self.assertEqual([0], offsets)
        self.assertEqual(2, result["recordCount"])
        self.assertEqual(1, result["pageCount"])
        self.assertNotIn("xml", json.dumps(result).lower())

    def test_full_then_empty_page_stops(self):
        offsets = []
        result = retrieve_all_requests(fetch_page=lambda offset: offsets.append(offset) or (
            self.page(1, PAGE_SIZE) if offset == 0 else "<Assets />"
        ))
        self.assertEqual([0, PAGE_SIZE], offsets)
        self.assertEqual(PAGE_SIZE, result["recordCount"])
        self.assertEqual(1, result["pageCount"])

    def test_duplicate_stable_ids_are_removed(self):
        first = self.page(1, PAGE_SIZE)
        second = assets_xml([request_asset(1), request_asset(101)])
        result = retrieve_all_requests(fetch_page=lambda offset: first if offset == 0 else second)
        self.assertEqual(PAGE_SIZE + 1, result["recordCount"])
        self.assertEqual(result["recordCount"], len({request["id"] for request in result["requests"]}))

    def test_maximum_page_limit(self):
        full = self.page(1, PAGE_SIZE)
        calls = []
        with self.assertRaises(VersionOneRequestsError):
            retrieve_all_requests(fetch_page=lambda offset: calls.append(offset) or full)
        self.assertEqual(MAX_PAGES, len(calls))

    def test_natural_sort(self):
        requests = [{"id": "10", "number": "R-10", "name": "Ten"}, {"id": "2", "number": "R-2", "name": "Two"}]
        self.assertEqual(["R-2", "R-10"], [item["number"] for item in sorted(requests, key=natural_request_key)])


class RequestPowerShellBoundaryTests(unittest.TestCase):
    def test_fixed_command_uses_shell_false_and_page_controls_only(self):
        captured = {}
        xml = "<Assets />"

        def run(command, **kwargs):
            captured.update(command=command, kwargs=kwargs)
            return subprocess.CompletedProcess(command, 0, json.dumps({
                "success": True,
                "xmlBase64": base64.b64encode(xml.encode()).decode(),
            }), "")

        self.assertEqual(xml, retrieve_versionone_request_page(200, powershell_executable="powershell.exe", run_process=run))
        self.assertFalse(captured["kwargs"]["shell"])
        self.assertEqual(["-PageSize", "100", "-Offset", "200"], captured["command"][-4:])


class RequestExplorerLogicTests(unittest.TestCase):
    def test_search_filters_options_and_natural_sort(self):
        module = (ROOT / "src" / "versionone" / "versionOneRequestFilters.ts").as_uri()
        script = f"""
          import assert from 'node:assert/strict';
          import {{ filterVersionOneRequests, requestFilterOptions, sortVersionOneRequests }} from '{module}';
          const requests = [
            {{ id: '10', oid: 'Request:10', href: null, number: 'R-10', name: 'Zeta Request', assetState: 'Active', status: 'Open', priority: 'Low', ownerName: 'Zoe' }},
            {{ id: '2', oid: 'Request:2', href: null, number: 'R-2', name: 'Alpha Request', assetState: 'Closed', status: 'Done', priority: 'High', ownerName: 'Amy' }},
            {{ id: '3', oid: 'Request:3', href: null, number: null, name: null, assetState: null, status: null, priority: null, ownerName: null }},
          ];
          assert.deepEqual(filterVersionOneRequests(requests, '  r-2  ', '', '', '').map(item => item.id), ['2']);
          assert.deepEqual(filterVersionOneRequests(requests, 'ALPHA', '', '', '').map(item => item.id), ['2']);
          assert.deepEqual(filterVersionOneRequests(requests, '', 'Open', '', '').map(item => item.id), ['10']);
          assert.deepEqual(filterVersionOneRequests(requests, '', '', 'High', '').map(item => item.id), ['2']);
          assert.deepEqual(filterVersionOneRequests(requests, '', '', '', 'Zoe').map(item => item.id), ['10']);
          assert.deepEqual(requestFilterOptions(requests, 'status'), ['Done', 'Open']);
          assert.deepEqual(requestFilterOptions(requests, 'priority'), ['High', 'Low']);
          assert.deepEqual(requestFilterOptions(requests, 'ownerName'), ['Amy', 'Zoe']);
          assert.deepEqual(sortVersionOneRequests(requests.slice(0, 2), 'number', 'ascending').map(item => item.number), ['R-2', 'R-10']);
        """
        completed = subprocess.run(
            ["node", "--experimental-strip-types", "--input-type=module", "--eval", script],
            cwd=ROOT, capture_output=True, text=True, timeout=15, check=False,
        )
        self.assertEqual(0, completed.returncode, completed.stderr)


class RequestApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        demo = Path(self.temp.name)
        (demo / "index.html").write_text("ShipCommand", encoding="utf-8")
        self.calls = 0

        def requests():
            self.calls += 1
            return {"recordCount": 0, "pageCount": 0, "retrievedAt": "2026-08-05T00:00:00.000Z", "durationMs": 1, "requests": []}

        self.server = serve_shipcommand.create_server(port=0, demo_directory=demo, requests=requests)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://localhost:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp.cleanup()

    def test_requests_endpoint_returns_normalized_json(self):
        with urlopen(f"{self.base}/api/versionone/requests") as response:
            payload = json.loads(response.read())
        self.assertEqual(200, response.status)
        self.assertEqual([], payload["requests"])
        self.assertEqual(1, self.calls)

    def test_browser_parameters_are_rejected_without_retrieval(self):
        with self.assertRaises(HTTPError) as error:
            urlopen(f"{self.base}/api/versionone/requests?endpoint=Story")
        self.assertEqual(400, error.exception.code)
        self.assertEqual(0, self.calls)
        self.assertNotIn("xml", json.dumps(json.loads(error.exception.read())).lower())
        error.exception.close()


if __name__ == "__main__":
    unittest.main()
