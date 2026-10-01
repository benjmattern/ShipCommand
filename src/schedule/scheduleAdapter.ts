import type { ReleaseSchedule } from '../releaseScheduleTypes';
import { createEmptyReleaseSchedule, normalizeReleaseSchedule } from '../releaseSchedules';
import type { Release as ScheduleRelease } from './types/release';

const phaseKeyById = {
  requirements: 'requirements',
  'dev-unit-testing': 'devUt',
  sit: 'sit',
  e2e: 'e2e',
  regression: 'regression',
  'cat-execution': 'catTesting',
} as const;

function phaseRange(schedule: ReleaseSchedule, phaseId: string) {
  const phase = schedule.phaseSchedules.find((candidate) => candidate.phaseId === phaseId);
  return { start: phase?.plannedStartDate ?? '', end: phase?.plannedEndDate ?? '' };
}

export function toReleaseSchedule(release: ScheduleRelease): ReleaseSchedule {
  const empty = createEmptyReleaseSchedule(release.releaseNumber);
  return normalizeReleaseSchedule({
    ...empty,
    plannedStartDate: [
      release.requirements.start,
      release.devUt.start,
      release.sit.start,
      release.e2e.start,
      release.regression.start,
      release.catReadyDate,
      release.catTesting.start,
    ].filter(Boolean).sort()[0] ?? null,
    plannedEndDate: release.prodDate || release.catTesting.end || null,
    phaseSchedules: empty.phaseSchedules.map((phase) => {
      if (phase.phaseId === 'cat-ready') {
        return { ...phase, plannedStartDate: release.catReadyDate || null, plannedEndDate: release.catReadyDate || null };
      }
      const key = phaseKeyById[phase.phaseId as keyof typeof phaseKeyById];
      if (!key) return phase;
      return {
        ...phase,
        plannedStartDate: release[key].start || null,
        plannedEndDate: release[key].end || null,
      };
    }),
  });
}

export function applyReleaseSchedule(
  releases: ScheduleRelease[],
  releaseNumber: string,
  schedule: ReleaseSchedule,
): ScheduleRelease[] {
  const key = releaseNumber.trim().toLowerCase();
  const existing = releases.find((release) => release.releaseNumber.trim().toLowerCase() === key);
  const now = new Date().toISOString();
  const next: ScheduleRelease = {
    id: existing?.id ?? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    releaseNumber,
    status: existing?.status ?? 'open',
    prodDate: schedule.plannedEndDate ?? existing?.prodDate ?? '',
    requirements: phaseRange(schedule, 'requirements'),
    devUt: phaseRange(schedule, 'dev-unit-testing'),
    sit: phaseRange(schedule, 'sit'),
    e2e: phaseRange(schedule, 'e2e'),
    regression: phaseRange(schedule, 'regression'),
    catReadyDate: phaseRange(schedule, 'cat-ready').start,
    catTesting: phaseRange(schedule, 'cat-execution'),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  return existing
    ? releases.map((release) => release.id === existing.id ? next : release)
    : [...releases, next];
}

