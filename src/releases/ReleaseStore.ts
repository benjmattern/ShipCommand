import { useMemo, useState } from 'react';
import type { DataRecord } from '../types';
import { applyReleaseUpdate, createReleaseId, createReleasesFromRecords, normalizeRelease } from './Release';
import type { Release, ReleaseMetadataUpdate, ReleaseStore } from './releaseTypes';

export function mergeReleaseMetadata(
  releases: Release[],
  metadataById: Readonly<Record<string, ReleaseMetadataUpdate>>,
) {
  return releases.map((release) => applyReleaseUpdate(release, metadataById[release.id] ?? {}));
}

export function updateReleaseMetadata(
  metadataById: Readonly<Record<string, ReleaseMetadataUpdate>>,
  release: Release,
  update: ReleaseMetadataUpdate,
) {
  const updatedRelease = applyReleaseUpdate(release, update);
  const { id: _id, name: _name, raidCount: _raidCount, ...metadata } = updatedRelease;
  return { ...metadataById, [release.id]: metadata };
}

export function useReleaseStore(records: DataRecord[], additionalReleaseNames: string[] = []): ReleaseStore {
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [metadataById, setMetadataById] = useState<Record<string, ReleaseMetadataUpdate>>({});
  const sourceReleases = useMemo(() => {
    const releases = createReleasesFromRecords(records);
    const existingIds = new Set(releases.map((release) => release.id));
    additionalReleaseNames.forEach((name) => {
      const id = createReleaseId(name);
      if (!name.trim() || existingIds.has(id)) return;
      releases.push(normalizeRelease({ id, name, raidCount: 0 }));
      existingIds.add(id);
    });
    return releases;
  }, [records, additionalReleaseNames.join('\u0000')]);
  const releases = useMemo(
    () => mergeReleaseMetadata(sourceReleases, metadataById),
    [sourceReleases, metadataById],
  );
  const selectedRelease = releases.find((release) => release.id === selectedReleaseId) ?? null;

  return {
    releases,
    selectedRelease,
    selectRelease: setSelectedReleaseId,
    updateRelease: (releaseId, update) => {
      const release = releases.find((candidate) => candidate.id === releaseId);
      if (!release) return;
      setMetadataById((current) => updateReleaseMetadata(current, release, update));
    },
  };
}
