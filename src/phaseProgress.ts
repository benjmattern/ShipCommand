import { deliveryPhases, isBooleanPhase, normalizePhaseIds } from './phases';
import { normalizeProgressStatusId } from './progressStatuses';
import type { DataRecord, PhaseProgress, ServiceAssignment } from './types';

export interface ProgressRollup {
  percentComplete: number | null;
  statusId: string;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

export function isPhaseReady(value: number) {
  return Number.isFinite(value) && value >= 100;
}

export function booleanToPhaseProgress(isReady: boolean) {
  return isReady ? 100 : 0;
}

export function normalizePhaseProgressValue(phaseId: string, value: number) {
  return isBooleanPhase(phaseId)
    ? booleanToPhaseProgress(isPhaseReady(value))
    : clampPercent(value);
}

export function formatPhaseProgressValue(phaseId: string, value: number) {
  return isBooleanPhase(phaseId)
    ? isPhaseReady(value) ? 'Ready' : 'Not ready'
    : `${value}%`;
}

export function createDefaultPhaseProgress(phaseId: string): PhaseProgress {
  return { phaseId, statusId: 'not-started', percentComplete: 0 };
}

export function normalizePhaseProgress(progress: PhaseProgress): PhaseProgress {
  const statusId = normalizeProgressStatusId(progress.statusId);
  let percentComplete = clampPercent(progress.percentComplete);

  if (statusId === 'complete') percentComplete = 100;
  if (statusId === 'not-started' || statusId === 'not-applicable') percentComplete = 0;
  if (statusId === 'in-progress') percentComplete = Math.max(1, Math.min(99, percentComplete));
  if (statusId === 'blocked') percentComplete = Math.min(99, percentComplete);

  const note = progress.note?.trim();
  return { phaseId: progress.phaseId, statusId, percentComplete, ...(note ? { note } : {}) };
}

export function reconcilePhaseProgress(applicablePhaseIds: string[], existing: PhaseProgress[] = []) {
  const applicableIds = normalizePhaseIds(applicablePhaseIds);
  const firstByPhase = new Map<string, PhaseProgress>();
  existing.forEach((progress) => {
    if (!firstByPhase.has(progress.phaseId)) firstByPhase.set(progress.phaseId, progress);
  });

  return applicableIds.map((phaseId) => normalizePhaseProgress(
    firstByPhase.get(phaseId) ?? createDefaultPhaseProgress(phaseId),
  ));
}

export function updatePhaseProgressStatus(progress: PhaseProgress, statusId: string) {
  const normalizedStatusId = normalizeProgressStatusId(statusId);
  const updated = normalizePhaseProgress({ ...progress, statusId: normalizedStatusId });
  return isBooleanPhase(progress.phaseId)
    ? { ...updated, percentComplete: booleanToPhaseProgress(normalizedStatusId === 'complete') }
    : updated;
}

export function updatePhaseProgressPercent(progress: PhaseProgress, value: number) {
  const percentComplete = normalizePhaseProgressValue(progress.phaseId, value);
  let statusId = progress.statusId;
  if (percentComplete === 100) statusId = 'complete';
  else if (percentComplete === 0 && statusId !== 'blocked' && statusId !== 'not-applicable') statusId = 'not-started';
  else if (percentComplete > 0 && statusId !== 'blocked') statusId = 'in-progress';
  return normalizePhaseProgress({ ...progress, statusId, percentComplete });
}

export function updateBooleanPhaseProgress(progress: PhaseProgress, isReady: boolean) {
  return normalizePhaseProgress({
    ...progress,
    statusId: isReady ? 'complete' : 'not-started',
    percentComplete: booleanToPhaseProgress(isReady),
  });
}

export function getOrderedPhaseProgress(assignment: ServiceAssignment) {
  return reconcilePhaseProgress(assignment.applicablePhaseIds, assignment.phaseProgress);
}

function calculateProgressRollup(entries: PhaseProgress[]): ProgressRollup {
  const counted = entries.filter((progress) => progress.statusId !== 'not-applicable');
  if (!counted.length) return { percentComplete: null, statusId: 'not-applicable' };

  const percentComplete = Math.round(counted.reduce((total, progress) => total + progress.percentComplete, 0) / counted.length);
  if (counted.some((progress) => progress.statusId === 'blocked' && progress.percentComplete < 100)) {
    return { percentComplete, statusId: 'blocked' };
  }
  if (counted.every((progress) => progress.statusId === 'complete')) return { percentComplete: 100, statusId: 'complete' };
  if (counted.some((progress) => progress.percentComplete > 0 || progress.statusId === 'in-progress')) {
    return { percentComplete, statusId: 'in-progress' };
  }
  return { percentComplete, statusId: 'not-started' };
}

export function calculateServiceProgress(assignment: ServiceAssignment) {
  return calculateProgressRollup(getOrderedPhaseProgress(assignment));
}

export function calculateRaidProgress(assignments: ServiceAssignment[]) {
  return calculateProgressRollup(assignments.flatMap(getOrderedPhaseProgress));
}

export function calculateReleaseProgress(records: DataRecord[]) {
  const raidRollups = records
    .map((record) => calculateRaidProgress(record.serviceAssignments))
    .filter((rollup) => rollup.percentComplete !== null);
  if (!raidRollups.length) return { percentComplete: null, statusId: 'not-applicable' };
  return calculateProgressRollup(raidRollups.map((rollup, index) => ({
    phaseId: `raid-${index}`,
    statusId: rollup.statusId,
    percentComplete: rollup.percentComplete!,
  })));
}

export function getPhaseProgressLabel(progress: PhaseProgress) {
  return deliveryPhases.find((phase) => phase.id === progress.phaseId)?.name ?? progress.phaseId;
}
