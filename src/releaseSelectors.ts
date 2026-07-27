import type { DataRecord } from './types';

export interface ReleaseFeature {
  raidItemId: string;
  release: string;
  title: string;
  priority: number;
  status: string;
  customerProject?: string;
  services?: string[];
}

export interface ReleaseSummary {
  name: string;
  featureCount: number;
  completedCount: number;
  remainingCount: number;
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
      services: record.services
        ?.split(',')
        .map((service) => service.trim())
        .filter(Boolean),
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
    };
    current.featureCount += 1;
    if (isCompletedStatus(feature.status)) current.completedCount += 1;
    else current.remainingCount += 1;
    summaries.set(feature.release, current);
  });

  return Array.from(summaries.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
