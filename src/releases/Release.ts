import type { DataRecord } from '../types';
import type { Release, ReleaseMetadataUpdate } from './releaseTypes';

const versionOneReleasePattern = /^\d+\.\d+\.\d+\.\d+$/;
const tslcProjectPattern = /^[A-Za-z0-9][A-Za-z0-9 ._:/-]*$/;
export const MAX_TSLC_PROJECT_LENGTH = 120;

export function createReleaseId(name: string) {
  return `release:${name.trim().toLowerCase()}`;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeOptionalCount(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : undefined;
}

export function normalizeRelease(release: Release): Release {
  const name = release.name.trim();
  if (!name) throw new Error('Release name is required.');
  return {
    id: createReleaseId(name),
    name,
    versionOneRelease: normalizeOptionalText(release.versionOneRelease),
    tslcProjectId: normalizeOptionalText(release.tslcProjectId),
    almReleaseId: normalizeOptionalText(release.almReleaseId),
    status: normalizeOptionalText(release.status),
    storyCount: normalizeOptionalCount(release.storyCount),
    defectCount: normalizeOptionalCount(release.defectCount),
    raidCount: Math.max(0, Math.trunc(release.raidCount || 0)),
    lastRefresh: normalizeOptionalText(release.lastRefresh),
    owner: normalizeOptionalText(release.owner),
    promotionDate: normalizeOptionalText(release.promotionDate),
    environment: normalizeOptionalText(release.environment),
    notes: normalizeOptionalText(release.notes),
  };
}

export function createReleasesFromRecords(records: DataRecord[]): Release[] {
  const byId = new Map<string, Release>();
  records.forEach((record) => {
    const name = record.release?.trim();
    if (!name) return;
    const id = createReleaseId(name);
    const existing = byId.get(id);
    if (existing) {
      existing.raidCount += 1;
      return;
    }
    byId.set(id, normalizeRelease({
      id,
      name,
      versionOneRelease: versionOneReleasePattern.test(name) ? name : undefined,
      raidCount: 1,
    }));
  });
  return Array.from(byId.values());
}

export function applyReleaseUpdate(release: Release, update: ReleaseMetadataUpdate): Release {
  return normalizeRelease({ ...release, ...update, id: release.id, name: release.name, raidCount: release.raidCount });
}

export function validateTslcProjectId(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return 'Enter a TSLC Project value.';
  if (normalized.length > MAX_TSLC_PROJECT_LENGTH) {
    return `Use ${MAX_TSLC_PROJECT_LENGTH} characters or fewer.`;
  }
  if (!tslcProjectPattern.test(normalized)) {
    return 'Use letters, numbers, spaces, periods, underscores, colons, slashes, or hyphens.';
  }
  return null;
}
