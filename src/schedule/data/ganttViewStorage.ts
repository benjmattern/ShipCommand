import type { GanttViewPreferences, TimelineScale } from '../types/release'

const VIEW_STORAGE_KEY = 'shipnav-gantt-view'
const DEFAULT_PREFERENCES: GanttViewPreferences = {
  scale: 'week',
  collapsedReleaseIds: [],
}

function isTimelineScale(value: unknown): value is TimelineScale {
  return value === 'day' || value === 'week' || value === 'month'
}

export function loadGanttViewPreferences(): GanttViewPreferences {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    if (!stored) return DEFAULT_PREFERENCES
    const parsed: unknown = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFERENCES
    const value = parsed as Record<string, unknown>
    return {
      scale: isTimelineScale(value.scale) ? value.scale : 'week',
      collapsedReleaseIds: Array.isArray(value.collapsedReleaseIds)
        ? value.collapsedReleaseIds.filter((id): id is string => typeof id === 'string')
        : [],
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveGanttViewPreferences(preferences: GanttViewPreferences): boolean {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    // View preferences are optional when storage is unavailable.
    return false
  }
}
