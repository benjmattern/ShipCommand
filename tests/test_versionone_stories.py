import importlib
import json
import tempfile
import threading
import unittest
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

SCRIPT_DIRECTORY = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIRECTORY))

from versionone_stories import (
    MAX_PAGES,
    PAGE_SIZE,
    VersionOneStoriesError,
    classify_record_type,
    parse_versionone_story_xml,
    retrieve_all_stories,
    validate_release,
)

SERVER_SPEC = importlib.util.spec_from_file_location("serve_shipcommand_stories", SCRIPT_DIRECTORY / "serve-shipcommand.py")
assert SERVER_SPEC and SERVER_SPEC.loader
serve_shipcommand = importlib.util.module_from_spec(SERVER_SPEC)
SERVER_SPEC.loader.exec_module(serve_shipcommand)


def story_asset(index, *, owners=(), missing=False, asset_type="Story", number_prefix="B"):
    attributes = "" if missing else f"""
      <Attribute name="Number">{number_prefix}-{index}</Attribute>
      <Attribute name="AssetState">Active</Attribute>
      <Attribute name="Status.Name">In Progress</Attribute>
      <Attribute name="Scope.Name">29.0.0.0</Attribute>
      <Attribute name="Team.Name">Team {index % 2}</Attribute>
    """
    owner_values = "".join(f"<Value>{owner}</Value>" for owner in owners)
    owners_attribute = f'<Attribute name="Owners.Name">{owner_values}</Attribute>' if owners else ""
    return f"""
    <Asset id="{asset_type}:{index}" href="https://versionone.usps.gov/{asset_type}/{index}">
      <Attribute name="Name">Synthetic Story {index}</Attribute>
      {attributes}
      {owners_attribute}
    </Asset>
    """


def assets_xml(stories, namespace=None):
    namespace_attribute = f' xmlns="{namespace}"' if namespace else ""
    return f"<Assets{namespace_attribute}>{''.join(stories)}</Assets>"


class VersionOneXmlParserTests(unittest.TestCase):
    def test_story_fields_and_multiple_owners_parse(self):
        stories = parse_versionone_story_xml(assets_xml([
            story_asset(1, owners=("Owner One", "Owner Two")),
        ]))
        self.assertEqual(1, len(stories))
        story = stories[0]
        self.assertEqual("Story:1", story["id"])
        self.assertEqual("Story:1", story["oid"])
        self.assertEqual("https://versionone.usps.gov/Story/1", story["href"])
        self.assertEqual("B-1", story["number"])
        self.assertEqual("story", story["recordType"])
        self.assertEqual("Synthetic Story 1", story["name"])
        self.assertEqual(["Owner One", "Owner Two"], story["ownerNames"])

    def test_missing_values_normalize_to_null_and_name_remains_text(self):
        story = parse_versionone_story_xml(assets_xml([story_asset(2, missing=True)]))[0]
        self.assertEqual("Synthetic Story 2", story["name"])
        self.assertIsNone(story["number"])
        self.assertEqual("other", story["recordType"])
        self.assertIsNone(story["status"])
        self.assertEqual([], story["ownerNames"])

    def test_namespaces_and_multiple_assets_parse(self):
        xml = """<Assets xmlns="urn:test">
          <Asset id="Story:1" href="https://versionone.usps.gov/Story/1">
            <Attribute name="Name">First</Attribute>
          </Asset>
          <Asset id="Story:2"><Attribute name="Name">Second</Attribute></Asset>
        </Assets>"""
        self.assertEqual(["First", "Second"], [story["name"] for story in parse_versionone_story_xml(xml)])

    def test_empty_page_and_unexpected_asset_types(self):
        self.assertEqual([], parse_versionone_story_xml("<Assets />"))
        xml = "<Assets><Asset id='Feature:1'><Attribute name='Name'>Feature</Attribute></Asset></Assets>"
        self.assertEqual([], parse_versionone_story_xml(xml))

    def test_malformed_xml_is_sanitized(self):
        with self.assertRaises(VersionOneStoriesError) as error:
            parse_versionone_story_xml("<Assets>")
        self.assertNotIn("<Assets>", error.exception.technical_detail)

    def test_record_type_classification_is_case_insensitive_and_safe(self):
        expectations = {
            "B-123": "story",
            "b-123": "story",
            "D-123": "defect",
            "d-123": "defect",
            "S-123": "other",
            None: "other",
        }
        for number, expected in expectations.items():
            with self.subTest(number=number):
                self.assertEqual(expected, classify_record_type(number))

    def test_defect_fields_retain_identity_and_coexist_with_story(self):
        records = parse_versionone_story_xml(assets_xml([
            story_asset(1),
            story_asset(2, asset_type="Defect", number_prefix="D"),
        ]))
        self.assertEqual(["story", "defect"], [record["recordType"] for record in records])
        defect = records[1]
        self.assertEqual("Defect:2", defect["oid"])
        self.assertEqual("https://versionone.usps.gov/Defect/2", defect["href"])


class PagingTests(unittest.TestCase):
    def page(self, start, count):
        return assets_xml([story_asset(index) for index in range(start, start + count)])

    def test_partial_page_stops_and_counts(self):
        offsets = []
        result = retrieve_all_stories("29.0.0.0", fetch_page=lambda release, asset_type, offset: (
            offsets.append((asset_type, offset)) or (self.page(1, 2) if asset_type == "Story" else "<Assets />")
        ))
        self.assertEqual([("Story", 0), ("Defect", 0)], offsets)
        self.assertEqual(1, result["pageCount"])
        self.assertEqual(2, result["recordCount"])
        self.assertEqual(2, result["storyCount"])
        self.assertEqual(0, result["defectCount"])
        self.assertNotIn("xml", json.dumps(result).lower())

    def test_full_page_requests_next_offset_and_empty_page_stops(self):
        offsets = []
        pages = {0: self.page(1, PAGE_SIZE), PAGE_SIZE: "<Assets />"}
        result = retrieve_all_stories(
            "29.0.0.0",
            fetch_page=lambda release, asset_type, offset: (
                offsets.append((asset_type, offset))
                or (pages[offset] if asset_type == "Story" else "<Assets />")
            ),
        )
        self.assertEqual([("Story", 0), ("Story", PAGE_SIZE), ("Defect", 0)], offsets)
        self.assertEqual(1, result["pageCount"])
        self.assertEqual(PAGE_SIZE, result["storyCount"])

    def test_multiple_pages_deduplicate_stable_ids(self):
        first = self.page(1, PAGE_SIZE)
        second = assets_xml([story_asset(1), story_asset(101)])
        result = retrieve_all_stories(
            "29.0.0.0",
            fetch_page=lambda release, asset_type, offset: (
                (first if offset == 0 else second) if asset_type == "Story" else "<Assets />"
            ),
        )
        self.assertEqual(2, result["pageCount"])
        self.assertEqual(PAGE_SIZE + 1, result["storyCount"])
        self.assertEqual(len({story["id"] for story in result["stories"]}), result["storyCount"])

    def test_maximum_page_guard(self):
        full_page = self.page(1, PAGE_SIZE)
        calls = 0

        def fetch_page(release, asset_type, offset):
            nonlocal calls
            calls += 1
            return full_page if asset_type == "Story" else "<Assets />"

        with self.assertRaises(VersionOneStoriesError):
            retrieve_all_stories("29.0.0.0", fetch_page=fetch_page)
        self.assertEqual(MAX_PAGES, calls)

    def test_story_and_defect_collections_combine_counts_pages_and_deduplicate(self):
        story_page = assets_xml([story_asset(1), story_asset(2)])
        defect_page = assets_xml([
            story_asset(3, asset_type="Defect", number_prefix="D"),
            story_asset(1),
        ])

        def fetch_page(release, asset_type, offset):
            self.assertEqual(0, offset)
            return story_page if asset_type == "Story" else defect_page

        result = retrieve_all_stories("29.0.0.0", fetch_page=fetch_page)
        self.assertEqual(2, result["pageCount"])
        self.assertEqual(3, result["recordCount"])
        self.assertEqual(2, result["storyCount"])
        self.assertEqual(1, result["defectCount"])
        self.assertEqual(0, result["otherCount"])
        self.assertEqual(len({record["id"] for record in result["stories"]}), 3)
        self.assertNotIn("xml", json.dumps(result).lower())

    def test_one_upstream_collection_may_be_empty(self):
        result = retrieve_all_stories(
            "29.0.0.0",
            fetch_page=lambda release, asset_type, offset: (
                "<Assets />" if asset_type == "Story"
                else assets_xml([story_asset(7, asset_type="Defect", number_prefix="D")])
            ),
        )
        self.assertEqual(1, result["recordCount"])
        self.assertEqual(1, result["defectCount"])
        self.assertEqual(1, result["pageCount"])

    def test_record_numbers_sort_naturally(self):
        result = retrieve_all_stories(
            "29.0.0.0",
            fetch_page=lambda release, asset_type, offset: (
                assets_xml([story_asset(10), story_asset(2)])
                if asset_type == "Story" else "<Assets />"
            ),
        )
        self.assertEqual(["B-2", "B-10"], [record["number"] for record in result["stories"]])

    def test_failure_in_either_collection_is_sanitized(self):
        def fetch_page(release, asset_type, offset):
            if asset_type == "Defect":
                raise VersionOneStoriesError("VersionOne stories could not be retrieved.", "Sanitized upstream failure.")
            return "<Assets />"

        with self.assertRaises(VersionOneStoriesError) as error:
            retrieve_all_stories("29.0.0.0", fetch_page=fetch_page)
        self.assertEqual("Sanitized upstream failure.", error.exception.technical_detail)

    def test_release_validation(self):
        self.assertEqual("29.0.0.0", validate_release(None))
        self.assertEqual("30.1.2.3", validate_release("30.1.2.3"))
        for invalid in ("", "R29.0.0.0", "29.0.0.0'", "29.0", "a" * 100):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    validate_release(invalid)


class StoriesApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.demo = Path(self.temporary_directory.name)
        (self.demo / "index.html").write_text("ShipCommand", encoding="utf-8")
        self.calls = []

        def stories(release):
            self.calls.append(release)
            return {
                "release": release,
                "recordCount": 0,
                "storyCount": 0,
                "defectCount": 0,
                "otherCount": 0,
                "pageCount": 0,
                "retrievedAt": "2026-07-29T20:00:00.000Z",
                "durationMs": 1,
                "stories": [],
            }

        self.server = serve_shipcommand.create_server(
            port=0,
            demo_directory=self.demo,
            diagnostic=lambda: (200, {"status": "connected"}),
            stories=stories,
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://localhost:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temporary_directory.cleanup()

    def get_json(self, path):
        with urlopen(f"{self.base_url}{path}") as response:
            return response.status, json.loads(response.read())

    def test_default_and_explicit_release(self):
        status, default = self.get_json("/api/versionone/stories")
        self.assertEqual(200, status)
        self.assertEqual("29.0.0.0", default["release"])
        status, explicit = self.get_json("/api/versionone/stories?release=30.1.2.3")
        self.assertEqual(200, status)
        self.assertEqual("30.1.2.3", explicit["release"])
        self.assertEqual(["29.0.0.0", "30.1.2.3"], self.calls)
        self.assertEqual(0, explicit["recordCount"])

    def test_repeated_release_requests_do_not_leak_state(self):
        for release in ("28.1.0.0", "30.0.2.1"):
            status, payload = self.get_json(f"/api/versionone/stories?release={release}")
            self.assertEqual(200, status)
            self.assertEqual(release, payload["release"])
            self.assertEqual([], payload["stories"])
        self.assertEqual(["28.1.0.0", "30.0.2.1"], self.calls)

    def test_invalid_release_is_400_without_retrieval(self):
        with self.assertRaises(HTTPError) as error:
            urlopen(f"{self.base_url}/api/versionone/stories?release=29.0.0.0%27")
        self.assertEqual(400, error.exception.code)
        payload = json.loads(error.exception.read())
        error.exception.close()
        self.assertEqual("failed", payload["status"])
        self.assertEqual([], self.calls)
        self.assertNotIn("xml", json.dumps(payload).lower())


if __name__ == "__main__":
    unittest.main()
    classify_record_type,
