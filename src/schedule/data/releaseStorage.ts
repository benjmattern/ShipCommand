import type { Release } from '../types/release'

const STORAGE_KEY = 'shipnav-releases'

const sampleReleases: Release[] = [
  {
    id: 'sample-r30',
    releaseNumber: 'R30.0.0.0',
    prodDate: '2026-08-14',
    status: 'open',
    requirements: { start: '2026-06-08', end: '2026-06-19' },
    devUt: { start: '2026-06-22', end: '2026-07-10' },
    sit: { start: '2026-07-06', end: '2026-07-17' },
    e2e: { start: '2026-07-13', end: '2026-07-24' },
    regression: { start: '2026-07-27', end: '2026-08-05' },
    catReadyDate: '2026-08-03',
    catTesting: { start: '2026-08-04', end: '2026-08-11' },
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'sample-r301',
    releaseNumber: 'R30.1.0.0',
    prodDate: '2026-09-11',
    status: 'open',
    requirements: { start: '2026-06-29', end: '2026-07-10' },
    devUt: { start: '2026-07-13', end: '2026-08-07' },
    sit: { start: '2026-08-03', end: '2026-08-14' },
    e2e: { start: '2026-08-10', end: '2026-08-21' },
    regression: { start: '2026-08-24', end: '2026-09-02' },
    catReadyDate: '2026-08-31',
    catTesting: { start: '2026-09-01', end: '2026-09-08' },
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'sample-r31',
    releaseNumber: 'R31.0.0.0',
    prodDate: '2026-10-09',
    status: 'open',
    requirements: { start: '2026-07-20', end: '2026-07-31' },
    devUt: { start: '2026-08-03', end: '2026-08-28' },
    sit: { start: '2026-08-24', end: '2026-09-04' },
    e2e: { start: '2026-08-31', end: '2026-09-11' },
    regression: { start: '2026-09-14', end: '2026-09-25' },
    catReadyDate: '2026-09-28',
    catTesting: { start: '2026-09-29', end: '2026-10-06' },
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
]

function isRelease(value: unknown): value is Release {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.releaseNumber === 'string' &&
    typeof item.prodDate === 'string' &&
    (item.status === 'open' || item.status === 'closed') &&
    (item.requirements === undefined || typeof item.requirements === 'object') &&
    typeof item.devUt === 'object' &&
    typeof item.sit === 'object' &&
    typeof item.e2e === 'object' &&
    typeof item.regression === 'object' &&
    typeof item.catTesting === 'object' &&
    typeof item.catReadyDate === 'string'
  )
}

export function loadReleases(): Release[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === null) {
    saveReleases(sampleReleases)
    return sampleReleases
  }

  try {
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.every(isRelease)
      ? parsed.map((release) => ({ ...release, requirements: release.requirements ?? { start: '', end: '' } }))
      : []
  } catch {
    return []
  }
}

export function saveReleases(releases: Release[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(releases))
    return true
  } catch {
    // Keep the in-memory app usable when storage is unavailable.
    return false
  }
}
