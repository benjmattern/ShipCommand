import { deliveryPhases } from './phases';
import type { IsoDate, PhaseSchedule, ReleaseSchedule, ScheduleValidationIssue } from './releaseScheduleTypes';

const controlledPhaseIds = new Set(deliveryPhases.map((phase) => phase.id));

function normalizeDate(value: IsoDate | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysByMonth[month - 1];
}

export function createEmptyReleaseSchedule(releaseId: string): ReleaseSchedule {
  return {
    releaseId: releaseId.trim(),
    plannedStartDate: null,
    plannedEndDate: null,
    phaseSchedules: deliveryPhases.map((phase) => ({
      phaseId: phase.id,
      plannedStartDate: null,
      plannedEndDate: null,
    })),
  };
}

export function getOrderedPhaseSchedules(schedule: ReleaseSchedule): PhaseSchedule[] {
  const firstByPhase = new Map<string, PhaseSchedule>();
  schedule.phaseSchedules.forEach((phaseSchedule) => {
    if (controlledPhaseIds.has(phaseSchedule.phaseId) && !firstByPhase.has(phaseSchedule.phaseId)) {
      firstByPhase.set(phaseSchedule.phaseId, phaseSchedule);
    }
  });

  return deliveryPhases.map((phase) => {
    const existing = firstByPhase.get(phase.id);
    return {
      phaseId: phase.id,
      plannedStartDate: normalizeDate(existing?.plannedStartDate ?? null),
      plannedEndDate: normalizeDate(existing?.plannedEndDate ?? null),
    };
  });
}

export function normalizeReleaseSchedule(schedule: ReleaseSchedule): ReleaseSchedule {
  return {
    releaseId: schedule.releaseId.trim(),
    plannedStartDate: normalizeDate(schedule.plannedStartDate),
    plannedEndDate: normalizeDate(schedule.plannedEndDate),
    phaseSchedules: getOrderedPhaseSchedules(schedule),
  };
}

export function getReleaseSchedule(schedules: ReleaseSchedule[], releaseId: string) {
  const normalizedReleaseId = releaseId.trim().toLowerCase();
  const schedule = schedules.find((candidate) => candidate.releaseId.trim().toLowerCase() === normalizedReleaseId);
  return schedule ? normalizeReleaseSchedule(schedule) : undefined;
}

function validateDate(
  issues: ScheduleValidationIssue[],
  value: IsoDate | null,
  releaseId: string,
  fieldName: string,
  phaseId?: string,
) {
  if (value !== null && !isIsoDate(value)) {
    issues.push({
      scope: phaseId ? 'phase' : 'release',
      releaseId,
      phaseId,
      code: 'invalid-date',
      message: `${fieldName} must be null or a valid YYYY-MM-DD date.`,
    });
  }
}

export function validateReleaseSchedule(schedule: ReleaseSchedule): ScheduleValidationIssue[] {
  const issues: ScheduleValidationIssue[] = [];
  const releaseId = schedule.releaseId.trim();

  if (!releaseId) {
    issues.push({ scope: 'release', releaseId, code: 'missing-release-id', message: 'Release ID is required.' });
  }

  validateDate(issues, schedule.plannedStartDate, releaseId, 'Release planned start date');
  validateDate(issues, schedule.plannedEndDate, releaseId, 'Release planned end date');
  if (isIsoDate(schedule.plannedStartDate) && isIsoDate(schedule.plannedEndDate) && schedule.plannedStartDate > schedule.plannedEndDate) {
    issues.push({ scope: 'release', releaseId, code: 'release-date-order', message: 'Release planned start date cannot be after its planned end date.' });
  }

  const seenPhases = new Set<string>();
  schedule.phaseSchedules.forEach((phaseSchedule) => {
    if (seenPhases.has(phaseSchedule.phaseId)) {
      issues.push({
        scope: 'phase',
        releaseId,
        phaseId: phaseSchedule.phaseId,
        code: 'duplicate-phase',
        message: `Phase ${phaseSchedule.phaseId} appears more than once.`,
      });
    }
    seenPhases.add(phaseSchedule.phaseId);

    if (!controlledPhaseIds.has(phaseSchedule.phaseId)) {
      issues.push({
        scope: 'phase',
        releaseId,
        phaseId: phaseSchedule.phaseId,
        code: 'unknown-phase',
        message: `Phase ${phaseSchedule.phaseId} is not a controlled delivery phase.`,
      });
    }

    validateDate(issues, phaseSchedule.plannedStartDate, releaseId, 'Phase planned start date', phaseSchedule.phaseId);
    validateDate(issues, phaseSchedule.plannedEndDate, releaseId, 'Phase planned end date', phaseSchedule.phaseId);
    if (
      isIsoDate(phaseSchedule.plannedStartDate)
      && isIsoDate(phaseSchedule.plannedEndDate)
      && phaseSchedule.plannedStartDate > phaseSchedule.plannedEndDate
    ) {
      issues.push({
        scope: 'phase',
        releaseId,
        phaseId: phaseSchedule.phaseId,
        code: 'phase-date-order',
        message: `Phase ${phaseSchedule.phaseId} planned start date cannot be after its planned end date.`,
      });
    }
  });

  return issues;
}

export function validateReleaseSchedules(schedules: ReleaseSchedule[]) {
  const issues = schedules.flatMap(validateReleaseSchedule);
  const seenReleases = new Set<string>();

  schedules.forEach((schedule) => {
    const releaseId = schedule.releaseId.trim().toLowerCase();
    if (seenReleases.has(releaseId)) {
      issues.push({
        scope: 'collection',
        releaseId: schedule.releaseId.trim(),
        code: 'duplicate-release',
        message: `Release ${schedule.releaseId.trim()} has more than one schedule.`,
      });
    }
    seenReleases.add(releaseId);
  });

  return issues;
}
