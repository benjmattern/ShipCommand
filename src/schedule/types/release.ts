export type ReleaseStatus = 'open' | 'closed'

export interface DateRange {
  start: string
  end: string
}

export interface Release {
  id: string
  releaseNumber: string
  prodDate: string
  status: ReleaseStatus
  requirements: DateRange
  devUt: DateRange
  sit: DateRange
  e2e: DateRange
  regression: DateRange
  catReadyDate: string
  catTesting: DateRange
  createdAt: string
  updatedAt: string
}

export type ReleaseDraft = Omit<Release, 'id' | 'createdAt' | 'updatedAt'>

export type RangedPhaseKey =
  | 'requirements'
  | 'devUt'
  | 'sit'
  | 'e2e'
  | 'regression'
  | 'catTesting'

export interface PhaseDateUpdate {
  releaseId: string
  phase: RangedPhaseKey
  start: string
  end: string
}

export type MilestoneKey = 'catReadyDate' | 'prodDate'

export interface MilestoneDateUpdate {
  releaseId: string
  milestone: MilestoneKey
  date: string
}

export type TimelineUndoAction =
  | {
      type: 'phase'
      releaseId: string
      phase: RangedPhaseKey
      previousStart: string
      previousEnd: string
    }
  | {
      type: 'milestone'
      releaseId: string
      milestone: MilestoneKey
      previousDate: string
    }

export type TimelineScale = 'day' | 'week' | 'month'

export interface GanttViewPreferences {
  scale: TimelineScale
  collapsedReleaseIds: string[]
}

export interface DuplicateReleaseRequest {
  sourceReleaseId: string
  releaseNumber: string
  prodDate: string
  status: ReleaseStatus
}

export interface ShipNavBackup {
  schemaVersion: 1
  exportedAt: string
  appName: 'ShipNav'
  releases: Release[]
  ganttViewPreferences: GanttViewPreferences
}

export interface MergeBackupResult {
  releases: Release[]
  importedCount: number
  skippedCount: number
  regeneratedIdCount: number
}

export type ScheduleIssueSeverity = 'error' | 'warning'

export type ScheduleIssueCode =
  | 'phase-end-before-start'
  | 'phase-after-prod'
  | 'cat-ready-after-prod'
  | 'cat-testing-after-prod'
  | 'phase-sequence'
  | 'phase-overlap'
  | 'large-gap'
  | 'missing-testing-schedule'
  | 'closed-release-future-date'
  | 'invalid-date'

export interface ScheduleIssue {
  id: string
  code: ScheduleIssueCode
  severity: ScheduleIssueSeverity
  message: string
  phase?: RangedPhaseKey
  relatedPhase?: RangedPhaseKey
  date?: string
}

export interface ReleaseScheduleHealth {
  releaseId: string
  issues: ScheduleIssue[]
  errorCount: number
  warningCount: number
  status: 'healthy' | 'warning' | 'error'
}
