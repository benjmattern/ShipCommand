import type { DataRecord } from './types';
import { getInvolvementTypeName } from './involvementTypes';
import { getMicroserviceName } from './microservices';
import { getPhaseNames } from './phases';
import { calculateRaidProgress, calculateReleaseProgress, calculateServiceProgress } from './phaseProgress';
import { getProgressStatusName } from './progressStatuses';
import { selectReleasePhaseRollups, summarizePhaseCompletion } from './releasePhaseSelectors';
import { normalizeServiceAssignments } from './serviceAssignments';
import { compareReleaseValuesDescending } from './releaseSorting';

export interface ReleaseFeature {
  raidItemId: string;
  release: string;
  title: string;
  priority: number;
  status: string;
  customerProject?: string;
  serviceAssignments: Array<{
    microserviceName: string;
    involvementTypeName: string;
    phaseNames: string[];
    progressPercent: number | null;
    progressStatusName: string;
  }>;
  progressPercent: number | null;
  unknownServiceLabels: string[];
}

export interface ReleaseSummary {
  name: string;
  featureCount: number;
  completedCount: number;
  remainingCount: number;
  progressPercent: number | null;
  phaseSummary: ReturnType<typeof summarizePhaseCompletion>;
}

const completedStatuses = new Set(['complete', 'completed', 'done']);

export function isCompletedStatus(status: string) {
  return completedStatuses.has(status.trim().toLowerCase());
}

export function selectReleaseFeatures(records: DataRecord[]): ReleaseFeature[] {
  return records
    .filter((record): record is DataRecord & { release: string } => Boolean(record.release?.trim()))
    .map((record) => ({
      raidItemId: record.id,
      release: record.release.trim(),
      title: record.title,
      priority: record.priority,
      status: record.status,
      customerProject: record.customer,
      serviceAssignments: normalizeServiceAssignments(record.serviceAssignments).map((assignment) => {
        const rollup = calculateServiceProgress(assignment);
        return {
          microserviceName: getMicroserviceName(assignment.microserviceId) ?? 'Unknown service',
          involvementTypeName: getInvolvementTypeName(assignment.involvementTypeId),
          phaseNames: getPhaseNames(assignment.applicablePhaseIds),
          progressPercent: rollup.percentComplete,
          progressStatusName: rollup.percentComplete === null ? 'N/A' : getProgressStatusName(rollup.statusId),
        };
      }),
      progressPercent: calculateRaidProgress(record.serviceAssignments).percentComplete,
      unknownServiceLabels: record.unknownServiceLabels ?? [],
    }));
}

export function selectReleaseSummaries(records: DataRecord[]): ReleaseSummary[] {
  const features = selectReleaseFeatures(records);
  const summaries = new Map<string, ReleaseSummary>();

  features.forEach((feature) => {
    const current = summaries.get(feature.release) ?? {
      name: feature.release,
      featureCount: 0,
      completedCount: 0,
      remainingCount: 0,
      progressPercent: null,
      phaseSummary: { blockedPhases: 0, completePhases: 0, activePhases: 0, notStartedPhases: 0, noWorkPhases: 0 },
    };
    current.featureCount += 1;
    if (isCompletedStatus(feature.status)) current.completedCount += 1;
    else current.remainingCount += 1;
    summaries.set(feature.release, current);
  });

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      progressPercent: calculateReleaseProgress(records.filter((record) => record.release?.trim() === summary.name)).percentComplete,
      phaseSummary: summarizePhaseCompletion(selectReleasePhaseRollups(records, summary.name)),
    }))
    .sort((a, b) => compareReleaseValuesDescending(a.name, b.name));
}
