import type { VersionOneStoriesError, VersionOneStoriesResponse } from './versionOneTypes';
import { DEFAULT_VERSIONONE_RELEASE } from './versionOneRelease';

export const versionOneInspectionRelease = DEFAULT_VERSIONONE_RELEASE;

function isStoriesResponse(value: unknown): value is VersionOneStoriesResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VersionOneStoriesResponse>;
  return typeof candidate.release === 'string'
    && typeof candidate.recordCount === 'number'
    && typeof candidate.storyCount === 'number'
    && typeof candidate.defectCount === 'number'
    && typeof candidate.otherCount === 'number'
    && typeof candidate.pageCount === 'number'
    && typeof candidate.retrievedAt === 'string'
    && typeof candidate.durationMs === 'number'
    && Array.isArray(candidate.stories)
    && candidate.stories.every((record) => (
      record
      && typeof record === 'object'
      && ['story', 'defect', 'other'].includes(record.recordType)
    ));
}

export async function loadVersionOneStories(
  release: string,
  request: typeof fetch = fetch,
): Promise<VersionOneStoriesResponse> {
  const params = new URLSearchParams({ release });
  const path = `/api/versionone/stories?${params.toString()}`;
  const response = await request(path, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const payload: unknown = await response.json();
  if (response.ok && isStoriesResponse(payload)) return payload;
  const error = payload as Partial<VersionOneStoriesError>;
  throw new Error(typeof error.message === 'string' ? error.message : 'VersionOne records could not be retrieved.');
}
