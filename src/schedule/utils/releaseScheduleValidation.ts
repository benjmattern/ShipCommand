import type { DateRange, RangedPhaseKey, Release, ReleaseScheduleHealth, ScheduleIssue } from '../types/release'
import { differenceInDays, getLocalTodayIso, isValidIsoDate } from './date'

export const LARGE_SCHEDULE_GAP_DAYS = 14

const rangedPhases: { key: RangedPhaseKey; label: string }[] = [
  { key: 'requirements', label: 'Requirements / Writing' },
  { key: 'devUt', label: 'DEV/UT' },
  { key: 'sit', label: 'SIT' },
  { key: 'e2e', label: 'E2E' },
  { key: 'regression', label: 'Regression' },
  { key: 'catTesting', label: 'CAT Execution' },
]

type Stage =
  | { kind: 'range'; key: RangedPhaseKey; label: string; range: DateRange }
  | { kind: 'milestone'; key: 'catReadyDate' | 'prodDate'; label: string; date: string }

function valid(date: string) {
  return Boolean(date) && isValidIsoDate(date)
}

function stageStart(stage: Stage) {
  if (stage.kind === 'milestone') return valid(stage.date) ? stage.date : ''
  return valid(stage.range.start) ? stage.range.start : valid(stage.range.end) ? stage.range.end : ''
}

function stageEnd(stage: Stage) {
  if (stage.kind === 'milestone') return valid(stage.date) ? stage.date : ''
  return valid(stage.range.end) ? stage.range.end : valid(stage.range.start) ? stage.range.start : ''
}

export function healthLabel(health: ReleaseScheduleHealth): string {
  if (health.status === 'healthy') return 'Schedule OK'
  const errors = health.errorCount ? `${health.errorCount} error${health.errorCount === 1 ? '' : 's'}` : ''
  const warnings = health.warningCount ? `${health.warningCount} warning${health.warningCount === 1 ? '' : 's'}` : ''
  return [errors, warnings].filter(Boolean).join(' · ')
}

export function validateReleaseSchedule(release: Release): ReleaseScheduleHealth {
  const issues: ScheduleIssue[] = []
  const add = (issue: Omit<ScheduleIssue, 'id'>) => {
    issues.push({ ...issue, id: `${issue.code}-${issue.phase ?? 'release'}-${issue.relatedPhase ?? issues.length}` })
  }

  rangedPhases.forEach(({ key, label }) => {
    const range = release[key]
    ;(['start', 'end'] as const).forEach((boundary) => {
      const date = range[boundary]
      if (date && !isValidIsoDate(date)) add({ code: 'invalid-date', severity: 'error', phase: key, date, message: `${label} has an invalid ${boundary} date.` })
    })
    if (valid(range.start) && valid(range.end) && range.end < range.start) {
      add({ code: 'phase-end-before-start', severity: 'error', phase: key, message: `${label} ends before it starts.` })
    }
  })

  if (!valid(release.prodDate)) {
    add({ code: 'invalid-date', severity: 'error', date: release.prodDate, message: 'PROD is missing or contains an invalid date.' })
  }
  if (release.catReadyDate && !valid(release.catReadyDate)) {
    add({ code: 'invalid-date', severity: 'error', date: release.catReadyDate, message: 'CAT Ready contains an invalid date.' })
  }

  if (valid(release.prodDate)) {
    rangedPhases.forEach(({ key, label }) => {
      const range = release[key]
      if ((valid(range.start) && range.start > release.prodDate) || (valid(range.end) && range.end > release.prodDate)) {
        add({
          code: key === 'catTesting' ? 'cat-testing-after-prod' : 'phase-after-prod',
          severity: 'warning',
          phase: key,
          message: `${label} is scheduled after PROD.`,
        })
      }
    })
    if (valid(release.catReadyDate) && release.catReadyDate > release.prodDate) {
      add({ code: 'cat-ready-after-prod', severity: 'error', date: release.catReadyDate, message: 'CAT Ready occurs after PROD.' })
    }
  }

  const stages: Stage[] = [
    { kind: 'range', key: 'requirements', label: 'Requirements / Writing', range: release.requirements },
    { kind: 'range', key: 'devUt', label: 'DEV/UT', range: release.devUt },
    { kind: 'range', key: 'sit', label: 'SIT', range: release.sit },
    { kind: 'range', key: 'e2e', label: 'E2E', range: release.e2e },
    { kind: 'range', key: 'regression', label: 'Regression', range: release.regression },
    { kind: 'milestone', key: 'catReadyDate', label: 'CAT Ready', date: release.catReadyDate },
    { kind: 'range', key: 'catTesting', label: 'CAT Execution', range: release.catTesting },
    { kind: 'milestone', key: 'prodDate', label: 'PROD', date: release.prodDate },
  ]

  for (let index = 0; index < stages.length - 1; index += 1) {
    const earlier = stages[index]
    const later = stages[index + 1]
    const earlierStart = stageStart(earlier)
    const earlierEnd = stageEnd(earlier)
    const laterStart = stageStart(later)
    const laterEnd = stageEnd(later)
    if (earlierStart && laterEnd && laterEnd < earlierStart) {
      add({
        code: 'phase-sequence',
        severity: 'warning',
        phase: later.kind === 'range' ? later.key : undefined,
        relatedPhase: earlier.kind === 'range' ? earlier.key : undefined,
        message: `${later.label} is scheduled before ${earlier.label}.`,
      })
    }
    if (earlierEnd && laterStart) {
      const gap = differenceInDays(earlierEnd, laterStart) - 1
      if (gap > LARGE_SCHEDULE_GAP_DAYS) {
        add({
          code: 'large-gap',
          severity: 'warning',
          phase: earlier.kind === 'range' ? earlier.key : undefined,
          relatedPhase: later.kind === 'range' ? later.key : undefined,
          message: `There is a ${gap}-day gap between ${earlier.label} and ${later.label}.`,
        })
      }
    }
  }

  const overlapPairs: [RangedPhaseKey, RangedPhaseKey][] = [
    ['requirements', 'devUt'],
    ['devUt', 'sit'],
    ['sit', 'e2e'],
    ['e2e', 'regression'],
    ['regression', 'catTesting'],
  ]
  overlapPairs.forEach(([firstKey, secondKey]) => {
    const first = release[firstKey]
    const second = release[secondKey]
    if (!valid(first.start) || !valid(first.end) || !valid(second.start) || !valid(second.end) || first.end < first.start || second.end < second.start) return
    const overlapStart = first.start > second.start ? first.start : second.start
    const overlapEnd = first.end < second.end ? first.end : second.end
    if (overlapEnd >= overlapStart) {
      const days = differenceInDays(overlapStart, overlapEnd) + 1
      const firstLabel = rangedPhases.find(({ key }) => key === firstKey)?.label ?? firstKey
      const secondLabel = rangedPhases.find(({ key }) => key === secondKey)?.label ?? secondKey
      add({ code: 'phase-overlap', severity: 'warning', phase: firstKey, relatedPhase: secondKey, message: `${firstLabel} overlaps ${secondLabel} by ${days} day${days === 1 ? '' : 's'}.` })
    }
  })

  const testingKeys: RangedPhaseKey[] = ['sit', 'e2e', 'regression', 'catTesting']
  if (valid(release.prodDate) && !testingKeys.some((key) => release[key].start || release[key].end)) {
    add({ code: 'missing-testing-schedule', severity: 'warning', message: 'PROD is scheduled, but no testing phases have dates.' })
  }

  if (release.status === 'closed') {
    const dates = [
      release.prodDate,
      release.catReadyDate,
      ...rangedPhases.flatMap(({ key }) => [release[key].start, release[key].end]),
    ].filter(valid)
    if (dates.some((date) => date > getLocalTodayIso())) {
      add({ code: 'closed-release-future-date', severity: 'warning', message: 'This release is closed but has schedule dates in the future.' })
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === 'error').length
  const warningCount = issues.length - errorCount
  return {
    releaseId: release.id,
    issues,
    errorCount,
    warningCount,
    status: errorCount ? 'error' : warningCount ? 'warning' : 'healthy',
  }
}
