import { getOrderedPhaseProgress } from './phaseProgress';
import { deliveryPhases } from './phases';
import type { DataRecord, PhaseProgress } from './types';

export interface ReleasePhaseRollup {
  phaseId: string;
  statusId: 'not-started' | 'in-progress' | 'blocked' | 'complete' | 'not-applicable';
  averagePercent: number | null;
  applicableProgressCount: number;
  completeCount: number;
  blockedCount: number;
  inProgressCount: number;
  notStartedCount: number;
}

export function collectReleasePhaseProgress(records: DataRecord[], release: string, phaseId: string) {
  return records
    .filter((record) => record.release?.trim() === release)
    .flatMap((record) => record.serviceAssignments)
    .flatMap(getOrderedPhaseProgress)
    .filter((progress) => progress.phaseId === phaseId);
}

export function derivePhaseRollup(phaseId: string, entries: PhaseProgress[]): ReleasePhaseRollup {
  const counted = entries.filter((progress) => progress.statusId !== 'not-applicable');
  const completeCount = counted.filter((progress) => progress.statusId === 'complete').length;
  const blockedCount = counted.filter((progress) => progress.statusId === 'blocked').length;
  const inProgressCount = counted.filter((progress) => progress.statusId === 'in-progress').length;
  const notStartedCount = counted.filter((progress) => progress.statusId === 'not-started').length;

  let statusId: ReleasePhaseRollup['statusId'] = 'not-started';
  if (!counted.length) statusId = 'not-applicable';
  else if (blockedCount > 0) statusId = 'blocked';
  else if (completeCount === counted.length) statusId = 'complete';
  else if (counted.some((progress) => progress.percentComplete > 0 || progress.statusId === 'in-progress')) statusId = 'in-progress';

  return {
    phaseId,
    statusId,
    averagePercent: counted.length
      ? Math.round(counted.reduce((sum, progress) => sum + progress.percentComplete, 0) / counted.length)
      : null,
    applicableProgressCount: counted.length,
    completeCount,
    blockedCount,
    inProgressCount,
    notStartedCount,
  };
}

export function selectReleasePhaseRollups(records: DataRecord[], release: string) {
  return deliveryPhases
    .filter((phase) => phase.active)
    .map((phase) => derivePhaseRollup(phase.id, collectReleasePhaseProgress(records, release, phase.id)));
}

export function selectAttentionPhases(rollups: ReleasePhaseRollup[]) {
  return rollups.filter((rollup) => rollup.statusId === 'blocked');
}

export function summarizePhaseCompletion(rollups: ReleasePhaseRollup[]) {
  return {
    blockedPhases: rollups.filter((rollup) => rollup.statusId === 'blocked').length,
    completePhases: rollups.filter((rollup) => rollup.statusId === 'complete').length,
    activePhases: rollups.filter((rollup) => rollup.statusId === 'in-progress' || rollup.statusId === 'not-started').length,
    notStartedPhases: rollups.filter((rollup) => rollup.statusId === 'not-started').length,
    noWorkPhases: rollups.filter((rollup) => rollup.statusId === 'not-applicable').length,
  };
}

export function calculateRaidPhaseRollup(record: DataRecord, phaseId: string) {
  const entries = record.serviceAssignments
    .flatMap(getOrderedPhaseProgress)
    .filter((progress) => progress.phaseId === phaseId);
  return derivePhaseRollup(phaseId, entries);
}

export function getPhaseRollupStatusLabel(statusId: ReleasePhaseRollup['statusId']) {
  if (statusId === 'not-applicable') return 'N/A';
  if (statusId === 'not-started') return 'Not Started';
  if (statusId === 'in-progress') return 'In Progress';
  return statusId === 'blocked' ? 'Blocked' : 'Complete';
}
