import subprocess
import unittest
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]


class RomLogicTests(unittest.TestCase):
    def run_typescript_module(self, relative_path, assertions):
        module = (ROOT / relative_path).as_uri()
        script = f"""
          import assert from 'node:assert/strict';
          import * as subject from '{module}';
          {assertions}
        """
        completed = subprocess.run(
            ["node", "--experimental-strip-types", "--input-type=module", "--eval", script],
            cwd=ROOT, capture_output=True, text=True, timeout=15, check=False,
        )
        self.assertEqual(0, completed.returncode, completed.stderr)

    def test_categories_and_totals_match_the_quick_rom_template(self):
        self.run_typescript_module(
            "src/rom/romTypes.ts",
            """
              assert.deepEqual(subject.romVendors, ['LMI', 'Peraton', 'AFS', 'HII']);
              assert.equal(subject.romLineItems.length, 13);
              assert.equal(subject.romLineItems.filter(item => item.costType === 'Expense').length, 7);
              assert.equal(subject.romLineItems.filter(item => item.costType === 'Capital').length, 6);
              const totals = subject.calculateRomTotals({ '001.000': 10, '004.000': 5, '012.002': 2 }, 100);
              assert.deepEqual(totals, { expenseHours: 12, capitalHours: 5, totalHours: 17, totalCost: 1700 });
              assert.equal(subject.calculateRomTotals({}, null).totalCost, 0);
            """,
        )

    def test_session_submission_storage_is_sanitized(self):
        self.run_typescript_module(
            "src/rom/romStore.ts",
            """
              const values = new Map();
              const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
              const valid = { id: '1', createdAt: '2026-10-01T00:00:00Z', vendor: 'LMI', project: 'R-1 — Example', hourlyRate: 100, hoursByCode: {}, expenseHours: 1, capitalHours: 2, totalHours: 3, totalCost: 300 };
              subject.writeRomSubmissions(storage, [valid]);
              assert.deepEqual(subject.readRomSubmissions(storage), [valid]);
              values.set(subject.ROM_SUBMISSIONS_STORAGE_KEY, JSON.stringify([valid, { id: 'bad' }]));
              assert.deepEqual(subject.readRomSubmissions(storage), [valid]);
              values.set(subject.ROM_SUBMISSIONS_STORAGE_KEY, '{bad json');
              assert.deepEqual(subject.readRomSubmissions(storage), []);
            """,
        )

    def test_export_template_and_mapping_contract(self):
        template = ROOT / "src" / "data" / "QuickROMTemplate.xlsx"
        self.assertTrue(template.is_file())
        workbook = openpyxl.load_workbook(template, data_only=False)
        sheet = workbook["ROM"]
        self.assertEqual("Supplier :", sheet["B3"].value)
        self.assertEqual("Hourly Blended Rate :", sheet["B8"].value)
        self.assertEqual("Task Description", sheet["C12"].value)
        self.assertEqual("Total", sheet["C29"].value)

        source = (ROOT / "src" / "rom" / "romExcel.ts").read_text(encoding="utf-8")
        for address in ("C3", "C4", "C5", "C6", "C7", "C8", "C10", "D27", "E27", "D28", "E28", "D29", "E29"):
            self.assertIn(f"'{address}'", source)
        self.assertIn("Quick-ROM-", source)
        self.assertIn("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", source)

    def test_page_exposes_requested_demo_workflow(self):
        page = (ROOT / "src" / "rom" / "RomPage.tsx").read_text(encoding="utf-8")
        app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        for expected in (
            "Hourly blended rate", "Task order", "CLIN", "eBuy #", "Finance number",
            "Project / VersionOne Request", "Load Requests", "Estimated labor",
            "Save ROM", "ROM submissions", "Download Excel",
        ):
            self.assertIn(expected, page)
        self.assertIn("loadVersionOneRequests", page)
        self.assertIn("sessionStorage", page)
        self.assertIn("Quick ROM", app)
        self.assertIn("<RomPage />", app)


if __name__ == "__main__":
    unittest.main()
