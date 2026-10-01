import type { GanttViewPreferences, MergeBackupResult, Release, ShipNavBackup } from '../types/release'
import { isValidIsoDate } from './date'
import { normalizeReleaseNumber } from './releaseNumber'

export const SHIPNAV_BACKUP_SCHEMA_VERSION = 1

function createId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || isValidIsoDate(value))
}

function validRange(value: unknown): value is { start: string; end: string } {
  return isRecord(value) && validDate(value.start) && validDate(value.end)
}

function validateRelease(value: unknown, index: number): Release {
  if (!isRecord(value)) throw new Error(`Release ${index + 1} is not a valid object.`)
  if (typeof value.releaseNumber !== 'string' || !value.releaseNumber.trim()) throw new Error(`Release ${index + 1} is missing a release number.`)
  if (value.status !== 'open' && value.status !== 'closed') throw new Error(`Release ${value.releaseNumber} has an invalid status.`)
  if (!validDate(value.prodDate) || !validDate(value.catReadyDate)) throw new Error(`Release ${value.releaseNumber} contains an invalid milestone date.`)
  const requirements = validRange(value.requirements) ? value.requirements : { start: '', end: '' }
  if (!validRange(value.devUt) || !validRange(value.sit) || !validRange(value.e2e) || !validRange(value.regression) || !validRange(value.catTesting)) {
    throw new Error(`Release ${value.releaseNumber} contains an invalid phase range.`)
  }
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') throw new Error(`Release ${value.releaseNumber} is missing timestamp metadata.`)

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId(),
    releaseNumber: value.releaseNumber,
    prodDate: value.prodDate,
    status: value.status,
    requirements,
    devUt: value.devUt,
    sit: value.sit,
    e2e: value.e2e,
    regression: value.regression,
    catReadyDate: value.catReadyDate,
    catTesting: value.catTesting,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function validatePreferences(value: unknown): GanttViewPreferences {
  if (!isRecord(value)) throw new Error('The backup is missing Gantt view preferences.')
  if (value.scale !== 'day' && value.scale !== 'week' && value.scale !== 'month') throw new Error('The backup contains an invalid timeline scale.')
  if (!Array.isArray(value.collapsedReleaseIds) || !value.collapsedReleaseIds.every((id) => typeof id === 'string')) {
    throw new Error('The backup contains invalid collapsed release IDs.')
  }
  return { scale: value.scale, collapsedReleaseIds: value.collapsedReleaseIds }
}

export function buildShipNavBackup(releases: Release[], preferences: GanttViewPreferences): ShipNavBackup {
  return {
    schemaVersion: SHIPNAV_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'ShipNav',
    releases,
    ganttViewPreferences: preferences,
  }
}

export function parseShipNavBackup(json: string): ShipNavBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('The selected file does not contain valid JSON.')
  }
  if (!isRecord(parsed)) throw new Error('The backup root must be an object.')
  if (parsed.schemaVersion !== SHIPNAV_BACKUP_SCHEMA_VERSION) throw new Error(`Unsupported backup schema version: ${String(parsed.schemaVersion)}.`)
  if (!Array.isArray(parsed.releases)) throw new Error('The backup releases value must be an array.')

  const releases = parsed.releases.map(validateRelease)
  const numbers = new Set<string>()
  const ids = new Set<string>()
  releases.forEach((release) => {
    const normalized = normalizeReleaseNumber(release.releaseNumber)
    if (numbers.has(normalized)) throw new Error(`The backup contains duplicate release number ${release.releaseNumber}.`)
    numbers.add(normalized)
    if (ids.has(release.id)) {
      do release.id = createId()
      while (ids.has(release.id))
    }
    ids.add(release.id)
  })

  return {
    schemaVersion: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    appName: 'ShipNav',
    releases,
    ganttViewPreferences: validatePreferences(parsed.ganttViewPreferences),
  }
}

export function mergeBackupReleases(current: Release[], imported: Release[]): MergeBackupResult {
  const numbers = new Set(current.map((release) => normalizeReleaseNumber(release.releaseNumber)))
  const ids = new Set(current.map((release) => release.id))
  const additions: Release[] = []
  let skippedCount = 0
  let regeneratedIdCount = 0

  imported.forEach((release) => {
    if (numbers.has(normalizeReleaseNumber(release.releaseNumber))) {
      skippedCount += 1
      return
    }
    let id = release.id
    if (ids.has(id)) {
      do id = createId()
      while (ids.has(id))
      regeneratedIdCount += 1
    }
    additions.push({ ...release, id })
    numbers.add(normalizeReleaseNumber(release.releaseNumber))
    ids.add(id)
  })

  return { releases: [...current, ...additions], importedCount: additions.length, skippedCount, regeneratedIdCount }
}
