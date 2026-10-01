import type { DateRange, DuplicateReleaseRequest, Release, ReleaseDraft } from '../types/release'
import { differenceInDays, shiftIsoDate } from './date'

function shiftRange(range: DateRange, dayOffset: number): DateRange {
  return {
    start: shiftIsoDate(range.start, dayOffset),
    end: shiftIsoDate(range.end, dayOffset),
  }
}

export function getDuplicateDayOffset(source: Release, newProdDate: string): number {
  return differenceInDays(source.prodDate, newProdDate)
}

export function buildDuplicateDraft(source: Release, request: DuplicateReleaseRequest): ReleaseDraft {
  const dayOffset = getDuplicateDayOffset(source, request.prodDate)
  return {
    releaseNumber: request.releaseNumber.trim(),
    prodDate: request.prodDate,
    status: request.status,
    requirements: shiftRange(source.requirements, dayOffset),
    devUt: shiftRange(source.devUt, dayOffset),
    sit: shiftRange(source.sit, dayOffset),
    e2e: shiftRange(source.e2e, dayOffset),
    regression: shiftRange(source.regression, dayOffset),
    catReadyDate: shiftIsoDate(source.catReadyDate, dayOffset),
    catTesting: shiftRange(source.catTesting, dayOffset),
  }
}

export function getScheduleRange(release: ReleaseDraft): DateRange | null {
  const dates = [
    release.prodDate,
    release.catReadyDate,
    release.requirements.start,
    release.requirements.end,
    release.devUt.start,
    release.devUt.end,
    release.sit.start,
    release.sit.end,
    release.e2e.start,
    release.e2e.end,
    release.regression.start,
    release.regression.end,
    release.catTesting.start,
    release.catTesting.end,
  ].filter(Boolean)

  if (!dates.length) return null
  return {
    start: dates.reduce((earliest, date) => date < earliest ? date : earliest),
    end: dates.reduce((latest, date) => date > latest ? date : latest),
  }
}
