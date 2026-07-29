import type { ReleaseSchedule } from './releaseScheduleTypes';

// Non-authoritative POC planning dates, kept separate from BacklogData.xlsx.
export const releaseScheduleSeed: ReleaseSchedule[] = [
  {
    releaseId: 'R30.0.0.0',
    plannedStartDate: '2026-09-01',
    plannedEndDate: '2026-12-15',
    phaseSchedules: [
      { phaseId: 'requirements', plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-15' },
      { phaseId: 'dev-unit-testing', plannedStartDate: '2026-09-16', plannedEndDate: '2026-10-15' },
      { phaseId: 'sit', plannedStartDate: '2026-10-16', plannedEndDate: '2026-10-31' },
      { phaseId: 'e2e', plannedStartDate: '2026-11-01', plannedEndDate: '2026-11-15' },
      { phaseId: 'regression', plannedStartDate: '2026-11-16', plannedEndDate: '2026-11-30' },
      { phaseId: 'cat-ready', plannedStartDate: '2026-12-01', plannedEndDate: '2026-12-05' },
      { phaseId: 'cat-execution', plannedStartDate: '2026-12-06', plannedEndDate: '2026-12-15' },
    ],
  },
  {
    releaseId: 'R29.0.0.0',
    plannedStartDate: '2026-08-01',
    plannedEndDate: '2026-10-15',
    phaseSchedules: [
      { phaseId: 'requirements', plannedStartDate: '2026-08-01', plannedEndDate: '2026-08-14' },
      { phaseId: 'dev-unit-testing', plannedStartDate: '2026-08-15', plannedEndDate: '2026-09-15' },
      { phaseId: 'sit', plannedStartDate: '2026-09-16', plannedEndDate: null },
      { phaseId: 'e2e', plannedStartDate: null, plannedEndDate: null },
      { phaseId: 'regression', plannedStartDate: null, plannedEndDate: null },
      { phaseId: 'cat-ready', plannedStartDate: null, plannedEndDate: null },
      { phaseId: 'cat-execution', plannedStartDate: null, plannedEndDate: null },
    ],
  },
];

// R31.0.0.0 is an existing workbook Release with no seeded schedule.
