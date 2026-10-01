import type { Release } from '../types/release'
import { compareReleaseNumbers } from './releaseNumber'

const headers = ['Release Number', 'Status', 'Requirements Start', 'Requirements End', 'DEV/UT Start', 'DEV/UT End', 'SIT Start', 'SIT End', 'E2E Start', 'E2E End', 'Regression Start', 'Regression End', 'CAT Ready', 'CAT Execution Start', 'CAT Execution End', 'PROD', 'Created At', 'Updated At']

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function releasesToCsv(releases: Release[]): string {
  const rows = [...releases].sort(compareReleaseNumbers).map((release) => [
    release.releaseNumber, release.status, release.requirements.start, release.requirements.end, release.devUt.start, release.devUt.end,
    release.sit.start, release.sit.end, release.e2e.start, release.e2e.end,
    release.regression.start, release.regression.end, release.catReadyDate,
    release.catTesting.start, release.catTesting.end, release.prodDate,
    release.createdAt, release.updatedAt,
  ])
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`
}
