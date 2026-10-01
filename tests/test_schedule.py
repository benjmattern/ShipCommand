import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class IntegratedScheduleTests(unittest.TestCase):
    def test_schedule_is_a_top_level_shipcommand_view(self):
        app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        self.assertIn("'schedule'", app)
        self.assertIn("<SchedulePage", app)
        self.assertIn(">Schedule</span>", app)

    def test_shipnav_workflows_are_present(self):
        page = (ROOT / "src" / "schedule" / "SchedulePage.tsx").read_text(encoding="utf-8")
        for component in (
            "GanttChart",
            "DuplicateReleaseDialog",
            "DataManagementDialog",
            "ReleaseDetails",
            "ReleaseList",
            "ReleaseDialog",
        ):
            self.assertIn(component, page)

    def test_schedule_uses_shipcommand_phase_language(self):
        gantt = (ROOT / "src" / "schedule" / "components" / "GanttChart.tsx").read_text(encoding="utf-8")
        adapter = (ROOT / "src" / "schedule" / "scheduleAdapter.ts").read_text(encoding="utf-8")
        self.assertIn("Requirements", gantt)
        self.assertIn("CAT Execution", gantt)
        self.assertIn("'dev-unit-testing': 'devUt'", adapter)
        self.assertIn("'cat-execution': 'catTesting'", adapter)

    def test_release_workspace_and_schedule_share_schedule_records(self):
        tracker = (ROOT / "src" / "ReleaseTracker.tsx").read_text(encoding="utf-8")
        self.assertIn("toReleaseSchedule(plannerRelease)", tracker)
        self.assertIn("applyReleaseSchedule(scheduleReleases", tracker)

    def test_schedule_styles_are_scoped(self):
        stylesheet = (ROOT / "src" / "schedule" / "schedule.css").read_text(encoding="utf-8")
        for line in stylesheet.splitlines():
            stripped = line.lstrip()
            if "{" not in stripped or stripped.startswith("@"):
                continue
            self.assertIn("schedule-module", stripped)


if __name__ == "__main__":
    unittest.main()

