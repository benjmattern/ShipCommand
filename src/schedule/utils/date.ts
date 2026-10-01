const DAY_IN_MS = 86_400_000

export function parseIsoDateUtc(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function toIsoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return toIsoDate(parseIsoDateUtc(date) + days * DAY_IN_MS)
}

export function differenceInDays(start: string, end: string): number {
  return Math.round((parseIsoDateUtc(end) - parseIsoDateUtc(start)) / DAY_IN_MS)
}

export function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  return toIsoDate(parseIsoDateUtc(date)) === date
}

export function shiftIsoDate(date: string, dayOffset: number): string {
  return date ? addDays(date, dayOffset) : ''
}

export function formatDragDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(parseIsoDateUtc(date)))
}

export function getLocalTodayIso(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export { DAY_IN_MS }
