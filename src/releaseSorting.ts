interface ParsedRelease {
  kind: 'special' | 'numeric' | 'malformed';
  normalized: string;
  segments: number[];
}

function parseRelease(value: string): ParsedRelease {
  const normalized = value.trim();
  const withoutPrefix = normalized.replace(/^r/i, '');

  if (/^x\.x\.x$/i.test(withoutPrefix)) {
    return { kind: 'special', normalized, segments: [] };
  }

  if (/^\d+(?:\.\d+)*$/.test(withoutPrefix)) {
    return {
      kind: 'numeric',
      normalized,
      segments: withoutPrefix.split('.').map(Number),
    };
  }

  return { kind: 'malformed', normalized, segments: [] };
}

export function compareReleaseValuesDescending(left: string, right: string) {
  const a = parseRelease(left);
  const b = parseRelease(right);

  if (a.kind === 'special' || b.kind === 'special') {
    if (a.kind === b.kind) return 0;
    return a.kind === 'special' ? -1 : 1;
  }

  if (a.kind === 'numeric' && b.kind === 'numeric') {
    const segmentCount = Math.max(a.segments.length, b.segments.length);
    for (let index = 0; index < segmentCount; index += 1) {
      const difference = (b.segments[index] ?? 0) - (a.segments[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return b.segments.length - a.segments.length;
  }

  if (a.kind !== b.kind) return a.kind === 'numeric' ? -1 : 1;

  return a.normalized.localeCompare(b.normalized, undefined, { numeric: true, sensitivity: 'base' });
}
