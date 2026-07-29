export const VERSIONONE_RELEASE_PATTERN = /^\d+\.\d+\.\d+\.\d+$/;
export const DEFAULT_VERSIONONE_RELEASE = '29.0.0.0';

export function normalizeVersionOneRelease(value: string) {
  return value.trim();
}

export function validateVersionOneRelease(value: string): string | null {
  const normalized = normalizeVersionOneRelease(value);
  if (!normalized) return 'Enter a VersionOne release.';
  if (!VERSIONONE_RELEASE_PATTERN.test(normalized)) return 'Use the format 29.0.0.0.';
  return null;
}
