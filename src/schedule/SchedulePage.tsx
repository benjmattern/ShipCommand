import { useState } from 'react'
import './schedule.css'
import { GanttChart } from './components/GanttChart'
import { DuplicateReleaseDialog } from './components/DuplicateReleaseDialog'
import { DataManagementDialog } from './components/DataManagementDialog'
import { ReleaseList } from './components/ReleaseList'
import { ReleaseDetails } from './components/ReleaseDetails'
import { ReleaseDialog } from './components/ReleaseDialog'
import { saveReleases } from './data/releaseStorage'
import { saveGanttViewPreferences } from './data/ganttViewStorage'
import type { DuplicateReleaseRequest, GanttViewPreferences, MilestoneDateUpdate, PhaseDateUpdate, Release, ReleaseDraft, ReleaseScheduleHealth, ShipNavBackup, TimelineUndoAction } from './types/release'
import { compareReleaseNumbers, normalizeReleaseNumber } from './utils/releaseNumber'
import { buildDuplicateDraft } from './utils/releaseDuplication'
import { isValidIsoDate } from './utils/date'
import { mergeBackupReleases } from './utils/shipNavBackup'
import { validateReleaseSchedule } from './utils/releaseScheduleValidation'

function newId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sortReleases(releases: Release[]) {
  return [...releases].sort(compareReleaseNumbers)
}

type ReleaseDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; releaseId: string }

interface SchedulePageProps {
  releases: Release[]
  onReleasesChange: (releases: Release[]) => void
}

export function SchedulePage({ releases, onReleasesChange }: SchedulePageProps) {
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(() => releases[0]?.id ?? null)
  const [releaseDialog, setReleaseDialog] = useState<ReleaseDialogState>({ mode: 'closed' })
  const [showClosed, setShowClosed] = useState(false)
  const [timelineUndo, setTimelineUndo] = useState<TimelineUndoAction | null>(null)
  const [duplicateSource, setDuplicateSource] = useState<Release | null>(null)
  const [dataDialogOpen, setDataDialogOpen] = useState(false)
  const [ganttInstance, setGanttInstance] = useState(0)
  const [importedViewPreferences, setImportedViewPreferences] = useState<GanttViewPreferences | undefined>()
  const selectedRelease = releases.find((release) => release.id === selectedReleaseId) ?? null
  const dialogRelease = releaseDialog.mode === 'edit'
    ? releases.find((release) => release.id === releaseDialog.releaseId) ?? null
    : null
  const healthByReleaseId = new Map<string, ReleaseScheduleHealth>(
    releases.map((release) => [release.id, validateReleaseSchedule(release)]),
  )

  function updateReleases(next: Release[]) {
    const sorted = sortReleases(next)
    onReleasesChange(sorted)
    saveReleases(sorted)
  }

  function submitRelease(draft: ReleaseDraft) {
    const normalized = normalizeReleaseNumber(draft.releaseNumber)
    if (releases.some((release) => release.id !== dialogRelease?.id && normalizeReleaseNumber(release.releaseNumber) === normalized)) return
    const now = new Date().toISOString()
    if (dialogRelease) {
      updateReleases(releases.map((release) => release.id === dialogRelease.id ? { ...draft, id: release.id, createdAt: release.createdAt, updatedAt: now } : release))
      if (timelineUndo?.releaseId === dialogRelease.id) setTimelineUndo(null)
      setSelectedReleaseId(dialogRelease.id)
    } else {
      const id = newId()
      updateReleases([...releases, { ...draft, id, createdAt: now, updatedAt: now }])
      setSelectedReleaseId(id)
    }
    setReleaseDialog({ mode: 'closed' })
  }

  function createDuplicate(request: DuplicateReleaseRequest) {
    const source = releases.find((release) => release.id === request.sourceReleaseId)
    const normalized = normalizeReleaseNumber(request.releaseNumber)
    if (
      !source ||
      !isValidIsoDate(source.prodDate) ||
      !isValidIsoDate(request.prodDate) ||
      !normalized ||
      releases.some((release) => normalizeReleaseNumber(release.releaseNumber) === normalized)
    ) {
      if (!source) setDuplicateSource(null)
      return
    }
    const now = new Date().toISOString()
    const draft = buildDuplicateDraft(source, { ...request, releaseNumber: request.releaseNumber.trim() })
    const id = newId()
    updateReleases([...releases, { ...draft, id, createdAt: now, updatedAt: now }])
    setSelectedReleaseId(id)
    setTimelineUndo(null)
    setDuplicateSource(null)
  }

  function openCreateDialog() {
    setDuplicateSource(null)
    setDataDialogOpen(false)
    setReleaseDialog({ mode: 'create' })
  }

  function openEditDialog(release: Release) {
    setSelectedReleaseId(release.id)
    setDuplicateSource(null)
    setDataDialogOpen(false)
    setReleaseDialog({ mode: 'edit', releaseId: release.id })
  }

  function openDuplicateDialog(release: Release) {
    setReleaseDialog({ mode: 'closed' })
    setDataDialogOpen(false)
    setDuplicateSource(release)
  }

  function closeDuplicateDialog() {
    setDuplicateSource(null)
  }

  function replaceFromBackup(backup: ShipNavBackup) {
    const sorted = sortReleases(backup.releases)
    onReleasesChange(sorted)
    const releasesSaved = saveReleases(sorted)
    const preferencesSaved = saveGanttViewPreferences(backup.ganttViewPreferences)
    setTimelineUndo(null)
    setReleaseDialog({ mode: 'closed' })
    setDuplicateSource(null)
    setSelectedReleaseId(sorted[0]?.id ?? null)
    setImportedViewPreferences(backup.ganttViewPreferences)
    setGanttInstance((value) => value + 1)
    const warning = releasesSaved && preferencesSaved ? '' : ' Warning: the imported data could not be saved permanently.'
    return `Imported ${sorted.length} releases and replaced existing Schedule data.${warning}`
  }

  function mergeFromBackup(backup: ShipNavBackup) {
    const merged = mergeBackupReleases(releases, backup.releases)
    const sorted = sortReleases(merged.releases)
    onReleasesChange(sorted)
    const saved = saveReleases(sorted)
    setTimelineUndo(null)
    setReleaseDialog({ mode: 'closed' })
    setDuplicateSource(null)
    setSelectedReleaseId((current) => sorted.some((release) => release.id === current) ? current : sorted[0]?.id ?? null)
    const regenerated = merged.regeneratedIdCount ? ` Regenerated ${merged.regeneratedIdCount} conflicting ID${merged.regeneratedIdCount === 1 ? '' : 's'}.` : ''
    const warning = saved ? '' : ' Warning: the imported data could not be saved permanently.'
    return `Imported ${merged.importedCount} releases. Skipped ${merged.skippedCount} existing release number${merged.skippedCount === 1 ? '' : 's'}.${regenerated}${warning}`
  }

  function printTimeline() {
    setDataDialogOpen(false)
    window.setTimeout(() => window.print(), 0)
  }

  function deleteRelease(release: Release) {
    if (!window.confirm(`Delete ${release.releaseNumber}? This cannot be undone.`)) return
    const index = releases.findIndex((item) => item.id === release.id)
    const remaining = releases.filter((item) => item.id !== release.id)
    updateReleases(remaining)
    if (timelineUndo?.releaseId === release.id) setTimelineUndo(null)
    if (releaseDialog.mode === 'edit' && releaseDialog.releaseId === release.id) setReleaseDialog({ mode: 'closed' })
    if (selectedReleaseId === release.id) setSelectedReleaseId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
  }

  function toggleStatus(release: Release) {
    const updatedAt = new Date().toISOString()
    updateReleases(releases.map((item) => item.id === release.id ? { ...item, status: item.status === 'open' ? 'closed' : 'open', updatedAt } : item))
  }

  function updatePhaseDates(update: PhaseDateUpdate) {
    const currentRelease = releases.find((release) => release.id === update.releaseId)
    if (!currentRelease) {
      setTimelineUndo(null)
      return
    }
    const previousRange = currentRelease[update.phase]
    setTimelineUndo({
      type: 'phase',
      releaseId: update.releaseId,
      phase: update.phase,
      previousStart: previousRange.start,
      previousEnd: previousRange.end,
    })
    const updatedAt = new Date().toISOString()
    updateReleases(releases.map((release) => release.id === update.releaseId
      ? {
          ...release,
          [update.phase]: { start: update.start, end: update.end },
          updatedAt,
        }
      : release))
  }

  function updateMilestoneDate(update: MilestoneDateUpdate) {
    const currentRelease = releases.find((release) => release.id === update.releaseId)
    if (!currentRelease) {
      setTimelineUndo(null)
      return
    }
    setTimelineUndo({
      type: 'milestone',
      releaseId: update.releaseId,
      milestone: update.milestone,
      previousDate: currentRelease[update.milestone],
    })
    const updatedAt = new Date().toISOString()
    updateReleases(releases.map((release) => release.id === update.releaseId
      ? { ...release, [update.milestone]: update.date, updatedAt }
      : release))
  }

  function undoTimelineChange() {
    if (!timelineUndo) return
    const currentRelease = releases.find((release) => release.id === timelineUndo.releaseId)
    if (!currentRelease) {
      setTimelineUndo(null)
      return
    }

    const updatedAt = new Date().toISOString()
    const restored = timelineUndo.type === 'phase'
      ? releases.map((release) => release.id === timelineUndo.releaseId
          ? {
              ...release,
              [timelineUndo.phase]: {
                start: timelineUndo.previousStart,
                end: timelineUndo.previousEnd,
              },
              updatedAt,
            }
          : release)
      : releases.map((release) => release.id === timelineUndo.releaseId
          ? { ...release, [timelineUndo.milestone]: timelineUndo.previousDate, updatedAt }
          : release)
    updateReleases(restored)
    setTimelineUndo(null)
  }

  function timelineUndoLabel() {
    if (!timelineUndo) return undefined
    const release = releases.find((item) => item.id === timelineUndo.releaseId)
    if (!release) return 'Undo last timeline change'
    if (timelineUndo.type === 'milestone') {
      return `Undo ${timelineUndo.milestone === 'prodDate' ? 'PROD' : 'CAT Ready'} date change for ${release.releaseNumber}`
    }
    const phaseLabels: Record<typeof timelineUndo.phase, string> = {
      requirements: 'Requirements / Writing',
      devUt: 'DEV/UT',
      sit: 'SIT',
      e2e: 'E2E',
      regression: 'Regression',
      catTesting: 'CAT Execution',
    }
    return `Undo ${phaseLabels[timelineUndo.phase]} timeline change for ${release.releaseNumber}`
  }

  const openCount = releases.filter((release) => release.status === 'open').length

  return (
    <section className="schedule-module">
      <header className="app-header schedule-toolbar">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div className="brand">
          <h1>Schedule</h1>
          <p>Release Timeline Tracker</p>
        </div>
        <div className="header-summary"><span>{openCount}</span> active release{openCount === 1 ? '' : 's'}</div>
        <button type="button" className="data-button" aria-label="Open import and export data management" onClick={() => { setReleaseDialog({ mode: 'closed' }); setDuplicateSource(null); setDataDialogOpen(true) }}>Data</button>
      </header>
      <div className="schedule-content">
        <div className="top-grid">
          <ReleaseDetails release={selectedRelease} health={selectedRelease ? healthByReleaseId.get(selectedRelease.id) : undefined} hasReleases={releases.length > 0} onEdit={openEditDialog} onAdd={openCreateDialog} />
          <ReleaseList releases={releases} healthByReleaseId={healthByReleaseId} selectedReleaseId={selectedReleaseId} onSelect={(release) => setSelectedReleaseId(release.id)} onAdd={openCreateDialog} onEdit={openEditDialog} onDelete={deleteRelease} onToggleStatus={toggleStatus} onDuplicate={openDuplicateDialog} />
        </div>
        <GanttChart
          key={ganttInstance}
          releases={releases}
          showClosed={showClosed}
          onShowClosedChange={setShowClosed}
          onPhaseDateUpdate={updatePhaseDates}
          onMilestoneDateUpdate={updateMilestoneDate}
          canUndo={timelineUndo !== null}
          undoLabel={timelineUndoLabel()}
          onUndo={undoTimelineChange}
          initialViewPreferences={importedViewPreferences}
          healthByReleaseId={healthByReleaseId}
        />
      </div>
      {releaseDialog.mode !== 'closed' && (
        <ReleaseDialog
          key={releaseDialog.mode === 'edit' ? releaseDialog.releaseId : 'create'}
          mode={releaseDialog.mode}
          release={dialogRelease}
          releases={releases}
          onSubmit={submitRelease}
          onCancel={() => setReleaseDialog({ mode: 'closed' })}
        />
      )}
      {duplicateSource && (
        <DuplicateReleaseDialog
          source={duplicateSource}
          releases={releases}
          onCreate={createDuplicate}
          onCancel={closeDuplicateDialog}
        />
      )}
      {dataDialogOpen && (
        <DataManagementDialog
          releases={releases}
          onReplace={replaceFromBackup}
          onMerge={mergeFromBackup}
          onPrint={printTimeline}
          onCancel={() => setDataDialogOpen(false)}
        />
      )}
    </section>
  )
}
