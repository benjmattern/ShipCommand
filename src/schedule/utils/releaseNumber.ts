import type { Release } from '../types/release'

export function normalizeReleaseNumber(releaseNumber: string): string {
  return releaseNumber.trim().toLocaleLowerCase()
}

function numericSegments(releaseNumber: string): number[] {
  return releaseNumber
    .replace(/^R/i, '')
    .split('.')
    .map((segment) => Number(segment) || 0)
}

/**
 * Compares USPS release numbers segment by segment, treating missing segments as zero.
 */
export function compareReleaseNumbers(
  left: Pick<Release, 'releaseNumber'>,
  right: Pick<Release, 'releaseNumber'>,
): number {
  const leftSegments = numericSegments(left.releaseNumber)
  const rightSegments = numericSegments(right.releaseNumber)
  const segmentCount = Math.max(leftSegments.length, rightSegments.length)

  for (let index = 0; index < segmentCount; index += 1) {
    const difference = (leftSegments[index] ?? 0) - (rightSegments[index] ?? 0)
    if (difference !== 0) return difference
  }

  return 0
}
