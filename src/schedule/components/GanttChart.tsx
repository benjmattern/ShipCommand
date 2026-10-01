import { useRef, useState, type PointerEvent as ReactPointerEvent, type UIEvent } from 'react'
import type { DateRange, GanttViewPreferences, MilestoneDateUpdate, MilestoneKey, PhaseDateUpdate, RangedPhaseKey, Release, ReleaseScheduleHealth, TimelineScale } from '../types/release'
import { compareReleaseNumbers } from '../utils/releaseNumber'
import { addDays, DAY_IN_MS, differenceInDays, formatDragDate, getLocalTodayIso, isValidIsoDate, parseIsoDateUtc, toIsoDate } from '../utils/date'
import { loadGanttViewPreferences, saveGanttViewPreferences } from '../data/ganttViewStorage'
import { healthLabel } from '../utils/releaseScheduleValidation'

interface GanttChartProps {
  releases: Release[]
  showClosed: boolean
  onShowClosedChange: (show: boolean) => void
  onPhaseDateUpdate: (update: PhaseDateUpdate) => void
  onMilestoneDateUpdate: (update: MilestoneDateUpdate) => void
  canUndo: boolean
  undoLabel?: string
  onUndo: () => void
  initialViewPreferences?: GanttViewPreferences
  healthByReleaseId: Map<string, ReleaseScheduleHealth>
}

const phaseRows: { key: RangedPhaseKey; label: string }[] = [
  { key: 'requirements', label: 'Requirements' },
  { key: 'devUt', label: 'DEV/UT' },
  { key: 'sit', label: 'SIT' },
  { key: 'e2e', label: 'E2E' },
  { key: 'regression', label: 'Regression' },
  { key: 'catTesting', label: 'CAT Execution' },
]

function toTime(date: string) {
  return parseIsoDateUtc(date)
}

function formatTick(time: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(time))
}

function rangeDates(releases: Release[]) {
  const dates = releases.flatMap((release) => [
    release.prodDate,
    release.catReadyDate,
    ...phaseRows.flatMap(({ key }) => [release[key].start, release[key].end]),
  ]).filter(isValidIsoDate).map(toTime)
  if (!dates.length) return null
  const min = Math.min(...dates) - 7 * DAY_IN_MS
  const max = Math.max(...dates) + 7 * DAY_IN_MS
  return { start: min, end: max, duration: max - min }
}

interface MonthSegment {
  label: string
  left: number
  width: number
}

interface TimelineTick {
  time: number
  label: string
  major: boolean
}

function monthSegments(start: number, end: number): MonthSegment[] {
  const segments: MonthSegment[] = []
  const duration = end - start
  const startDate = new Date(start)
  let monthStart = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1)

  while (monthStart < end) {
    const monthDate = new Date(monthStart)
    const nextMonth = Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1)
    const visibleStart = Math.max(start, monthStart)
    const visibleEnd = Math.min(end, nextMonth)
    if (visibleEnd > visibleStart) {
      segments.push({
        label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate),
        left: ((visibleStart - start) / duration) * 100,
        width: ((visibleEnd - visibleStart) / duration) * 100,
      })
    }
    monthStart = nextMonth
  }
  return segments
}

function yearSegments(start: number, end: number): MonthSegment[] {
  const segments: MonthSegment[] = []
  const duration = end - start
  let year = new Date(start).getUTCFullYear()
  while (Date.UTC(year, 0, 1) < end) {
    const yearStart = Date.UTC(year, 0, 1)
    const nextYear = Date.UTC(year + 1, 0, 1)
    const visibleStart = Math.max(start, yearStart)
    const visibleEnd = Math.min(end, nextYear)
    if (visibleEnd > visibleStart) {
      segments.push({
        label: String(year),
        left: ((visibleStart - start) / duration) * 100,
        width: ((visibleEnd - visibleStart) / duration) * 100,
      })
    }
    year += 1
  }
  return segments
}

function timelineTicks(scale: TimelineScale, start: number, end: number): TimelineTick[] {
  const ticks: TimelineTick[] = []
  if (scale === 'day') {
    for (let time = start; time <= end; time += DAY_IN_MS) {
      const date = new Date(time)
      ticks.push({
        time,
        label: new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(date),
        major: date.getUTCDay() === 1,
      })
    }
    return ticks
  }
  if (scale === 'week') {
    for (let time = start; time <= end; time += 7 * DAY_IN_MS) {
      ticks.push({ time, label: formatTick(time), major: true })
    }
    return ticks
  }

  const startDate = new Date(start)
  let monthStart = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1)
  while (monthStart <= end) {
    const date = new Date(monthStart)
    const visibleTime = Math.max(start, monthStart)
    ticks.push({
      time: visibleTime,
      label: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date),
      major: true,
    })
    monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
  }
  return ticks
}

function releaseScheduleRange(release: Release): DateRange | null {
  const dates = [
    release.prodDate,
    release.catReadyDate,
    ...phaseRows.flatMap(({ key }) => [release[key].start, release[key].end]),
  ].filter(isValidIsoDate)
  if (!dates.length) return null
  return { start: dates.reduce((earliest, date) => date < earliest ? date : earliest), end: dates.reduce((latest, date) => date > latest ? date : latest) }
}

function partialLabel(range: DateRange) {
  if (range.start && !isValidIsoDate(range.start)) return 'Invalid start date'
  if (range.end && !isValidIsoDate(range.end)) return 'Invalid end date'
  if (range.start && !range.end) return `Starts ${formatTick(toTime(range.start))}`
  if (!range.start && range.end) return `Ends ${formatTick(toTime(range.end))}`
  return 'Not scheduled'
}

interface DragPreview {
  releaseId: string
  phase: RangedPhaseKey
  start: string
  end: string
  offsetDays: number
  mode: DragMode
}

type DragMode = 'move' | 'resize-start' | 'resize-end'

interface CreationPreview {
  releaseId: string
  phase: RangedPhaseKey
  start: string
  end: string
}

interface MilestonePreview {
  releaseId: string
  milestone: MilestoneKey
  date: string
  offsetDays: number
}

export function GanttChart({
  releases,
  showClosed,
  onShowClosedChange,
  onPhaseDateUpdate,
  onMilestoneDateUpdate,
  canUndo,
  undoLabel,
  onUndo,
  initialViewPreferences,
  healthByReleaseId,
}: GanttChartProps) {
  const [initialPreferences] = useState(() => initialViewPreferences ?? loadGanttViewPreferences())
  const topScrollRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const interactionElementRef = useRef<HTMLElement | null>(null)
  const [scale, setScale] = useState<TimelineScale>(initialPreferences.scale)
  const [collapsedReleaseIds, setCollapsedReleaseIds] = useState<Set<string>>(
    () => new Set(initialPreferences.collapsedReleaseIds),
  )
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [creationPreview, setCreationPreview] = useState<CreationPreview | null>(null)
  const [milestonePreview, setMilestonePreview] = useState<MilestonePreview | null>(null)
  const visible = releases
    .filter((release) => showClosed || release.status === 'open')
    .sort(compareReleaseNumbers)
  const timeline = rangeDates(visible)
  const daySpan = timeline ? Math.max(1, timeline.duration / DAY_IN_MS) : 1
  const pixelsPerDay: Record<TimelineScale, number> = { day: 28, week: 100 / 7, month: 150 / 30.44 }
  const chartWidth = Math.max(820, Math.ceil(daySpan * pixelsPerDay[scale]))
  const position = (date: string) => timeline && isValidIsoDate(date) ? ((toTime(date) - timeline.start) / timeline.duration) * 100 : 0
  const months = timeline ? monthSegments(timeline.start, timeline.end) : []
  const years = timeline ? yearSegments(timeline.start, timeline.end) : []
  const ticks = timeline ? timelineTicks(scale, timeline.start, timeline.end) : []
  const today = getLocalTodayIso()
  const showToday = timeline
    ? parseIsoDateUtc(today) >= timeline.start && parseIsoDateUtc(today) <= timeline.end
    : false
  const visibleHealth = visible.map((release) => healthByReleaseId.get(release.id)).filter((health): health is ReleaseScheduleHealth => Boolean(health))
  const visibleErrors = visibleHealth.reduce((count, health) => count + health.errorCount, 0)
  const visibleWarnings = visibleHealth.reduce((count, health) => count + health.warningCount, 0)

  function syncHorizontalScroll(event: UIEvent<HTMLDivElement>, target: 'top' | 'timeline') {
    const other = target === 'top' ? timelineScrollRef.current : topScrollRef.current
    if (other && other.scrollLeft !== event.currentTarget.scrollLeft) {
      other.scrollLeft = event.currentTarget.scrollLeft
    }
  }

  function fitTimeline() {
    if (topScrollRef.current) topScrollRef.current.scrollLeft = 0
    if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = 0
  }

  function cancelInteraction() {
    const element = interactionElementRef.current
    const pointerId = Number(element?.dataset.pointerId)
    if (element && Number.isFinite(pointerId) && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId)
    }
    interactionElementRef.current = null
    setDragPreview(null)
    setCreationPreview(null)
    setMilestonePreview(null)
  }

  function changeScale(nextScale: TimelineScale) {
    if (nextScale === scale) return
    cancelInteraction()
    setScale(nextScale)
    saveGanttViewPreferences({ scale: nextScale, collapsedReleaseIds: [...collapsedReleaseIds] })
    fitTimeline()
  }

  function updateCollapsed(next: Set<string>) {
    cancelInteraction()
    setCollapsedReleaseIds(next)
    saveGanttViewPreferences({ scale, collapsedReleaseIds: [...next] })
  }

  function toggleRelease(releaseId: string) {
    const next = new Set(collapsedReleaseIds)
    if (next.has(releaseId)) next.delete(releaseId)
    else next.add(releaseId)
    updateCollapsed(next)
  }

  const allVisibleCollapsed = visible.length > 0 && visible.every((release) => collapsedReleaseIds.has(release.id))

  function toggleAllVisible() {
    const next = new Set(collapsedReleaseIds)
    visible.forEach((release) => {
      if (allVisibleCollapsed) next.delete(release.id)
      else next.add(release.id)
    })
    updateCollapsed(next)
  }

  function beginDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    releaseId: string,
    phase: RangedPhaseKey,
    range: DateRange,
    mode: DragMode,
  ) {
    if (!timeline || !range.start || !range.end) return
    const timelineElement = event.currentTarget.closest<HTMLElement>('.timeline')
    if (!timelineElement) return

    event.currentTarget.setPointerCapture(event.pointerId)
    interactionElementRef.current = event.currentTarget
    const dragData = event.currentTarget.dataset
    dragData.pointerId = String(event.pointerId)
    dragData.releaseId = releaseId
    dragData.phase = phase
    dragData.startX = String(event.clientX)
    dragData.originalStart = range.start
    dragData.originalEnd = range.end
    dragData.dragMode = mode
    dragData.offsetDays = '0'
    dragData.dragActive = 'false'
    dragData.timelineWidth = String(timelineElement.getBoundingClientRect().width)
    dragData.displayedDays = String(timeline.duration / DAY_IN_MS)
  }

  function adjustedRange(dragData: DOMStringMap, offsetDays: number): DateRange {
    const originalStart = dragData.originalStart ?? ''
    const originalEnd = dragData.originalEnd ?? ''
    const mode = dragData.dragMode as DragMode

    if (mode === 'resize-start') {
      const proposedStart = addDays(originalStart, offsetDays)
      return {
        start: parseIsoDateUtc(proposedStart) > parseIsoDateUtc(originalEnd) ? originalEnd : proposedStart,
        end: originalEnd,
      }
    }
    if (mode === 'resize-end') {
      const proposedEnd = addDays(originalEnd, offsetDays)
      return {
        start: originalStart,
        end: parseIsoDateUtc(proposedEnd) < parseIsoDateUtc(originalStart) ? originalStart : proposedEnd,
      }
    }
    return {
      start: addDays(originalStart, offsetDays),
      end: addDays(originalEnd, offsetDays),
    }
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const dragData = event.currentTarget.dataset
    const movement = event.clientX - Number(dragData.startX)
    if (dragData.dragActive !== 'true' && Math.abs(movement) < 3) return

    dragData.dragActive = 'true'
    event.preventDefault()
    const offsetDays = Math.round((movement / Number(dragData.timelineWidth)) * Number(dragData.displayedDays))
    dragData.offsetDays = String(offsetDays)
    const range = adjustedRange(dragData, offsetDays)
    const mode = dragData.dragMode as DragMode
    const effectiveOffset = mode === 'resize-end'
      ? differenceInDays(dragData.originalEnd ?? '', range.end)
      : differenceInDays(dragData.originalStart ?? '', range.start)
    setDragPreview({
      releaseId: dragData.releaseId ?? '',
      phase: dragData.phase as RangedPhaseKey,
      start: range.start,
      end: range.end,
      offsetDays: effectiveOffset,
      mode,
    })
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>, commit: boolean) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const dragData = event.currentTarget.dataset

    event.currentTarget.releasePointerCapture(event.pointerId)
    if (interactionElementRef.current === event.currentTarget) interactionElementRef.current = null
    const offsetDays = Number(dragData.offsetDays)
    if (commit && dragData.dragActive === 'true' && offsetDays !== 0) {
      const range = adjustedRange(dragData, offsetDays)
      onPhaseDateUpdate({
        releaseId: dragData.releaseId ?? '',
        phase: dragData.phase as RangedPhaseKey,
        start: range.start,
        end: range.end,
      })
    }
    setDragPreview(null)
  }

  function displayedRange(releaseId: string, phase: RangedPhaseKey, range: DateRange) {
    return dragPreview?.releaseId === releaseId && dragPreview.phase === phase
      ? { start: dragPreview.start, end: dragPreview.end }
      : range
  }

  function renderPhaseBar(release: Release, phase: RangedPhaseKey, label: string) {
    const range = release[phase]
    if (!range.start && !range.end) {
      const preview = creationPreview?.releaseId === release.id && creationPreview.phase === phase
        ? creationPreview
        : null

      function dateAtPointer(event: ReactPointerEvent<HTMLDivElement>) {
        if (!timeline) return ''
        const bounds = event.currentTarget.getBoundingClientRect()
        const x = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width)
        const dayOffset = Math.round((x / bounds.width) * (timeline.duration / DAY_IN_MS))
        return toIsoDate(timeline.start + dayOffset * DAY_IN_MS)
      }

      function beginCreation(event: ReactPointerEvent<HTMLDivElement>) {
        if (!timeline || dragPreview || milestonePreview) return
        const anchorDate = dateAtPointer(event)
        event.currentTarget.setPointerCapture(event.pointerId)
        interactionElementRef.current = event.currentTarget
        event.currentTarget.dataset.pointerId = String(event.pointerId)
        event.currentTarget.dataset.anchorDate = anchorDate
        setCreationPreview({ releaseId: release.id, phase, start: anchorDate, end: anchorDate })
      }

      function moveCreation(event: ReactPointerEvent<HTMLDivElement>) {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        event.preventDefault()
        const anchorDate = event.currentTarget.dataset.anchorDate ?? ''
        const pointerDate = dateAtPointer(event)
        setCreationPreview({
          releaseId: release.id,
          phase,
          start: parseIsoDateUtc(anchorDate) <= parseIsoDateUtc(pointerDate) ? anchorDate : pointerDate,
          end: parseIsoDateUtc(anchorDate) <= parseIsoDateUtc(pointerDate) ? pointerDate : anchorDate,
        })
      }

      function finishCreation(event: ReactPointerEvent<HTMLDivElement>, commit: boolean) {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        const anchorDate = event.currentTarget.dataset.anchorDate ?? ''
        const pointerDate = dateAtPointer(event)
        event.currentTarget.releasePointerCapture(event.pointerId)
        if (interactionElementRef.current === event.currentTarget) interactionElementRef.current = null
        if (commit) {
          onPhaseDateUpdate({
            releaseId: release.id,
            phase,
            start: parseIsoDateUtc(anchorDate) <= parseIsoDateUtc(pointerDate) ? anchorDate : pointerDate,
            end: parseIsoDateUtc(anchorDate) <= parseIsoDateUtc(pointerDate) ? pointerDate : anchorDate,
          })
        }
        setCreationPreview(null)
      }

      return (
        <div
          className={`schedule-lane${preview ? ' is-creating' : ''}`}
          role="button"
          aria-label={`Schedule ${label} for release ${release.releaseNumber}`}
          onPointerDown={beginCreation}
          onPointerMove={moveCreation}
          onPointerUp={(event) => finishCreation(event, true)}
          onPointerCancel={(event) => finishCreation(event, false)}
        >
          {!preview && <span>Drag to schedule</span>}
          {preview && (
            <div className={`phase-bar ${phase} creation-preview`} style={{ left: `${position(preview.start)}%`, width: `${Math.max(position(preview.end) - position(preview.start), 0.7)}%` }}>
              <span className="drag-tooltip">{formatDragDate(preview.start)} – {formatDragDate(preview.end)}</span>
            </div>
          )}
        </div>
      )
    }
    if ((range.start && !isValidIsoDate(range.start)) || (range.end && !isValidIsoDate(range.end))) {
      return <span className="unscheduled">{partialLabel(range)}</span>
    }
    if (!range.start || !range.end) return <span className="unscheduled">{partialLabel(range)}</span>

    const shownRange = displayedRange(release.id, phase, range)
    const preview = dragPreview?.releaseId === release.id && dragPreview.phase === phase ? dragPreview : null
    const barHandlers = {
      onPointerMove: moveDrag,
      onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => finishDrag(event, true),
      onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => finishDrag(event, false),
    }
    const beginResize = (event: ReactPointerEvent<HTMLDivElement>, mode: DragMode) => {
      event.stopPropagation()
      beginDrag(event, release.id, phase, range, mode)
    }

    return (
      <div
        className={`phase-bar ${phase} draggable${preview ? ' is-dragging' : ''}${preview && preview.mode !== 'move' ? ' is-resizing' : ''}`}
        style={{ left: `${position(shownRange.start)}%`, width: `${Math.max(position(shownRange.end) - position(shownRange.start), 0.7)}%` }}
        aria-label={`${release.releaseNumber} ${label} from ${shownRange.start} to ${shownRange.end}`}
        role="img"
        onPointerDown={(event) => beginDrag(event, release.id, phase, range, 'move')}
        {...barHandlers}
      >
        <div
          className="resize-handle resize-start"
          aria-label={`Resize ${release.releaseNumber} ${label} start date, currently ${shownRange.start}`}
          role="button"
          onPointerDown={(event) => beginResize(event, 'resize-start')}
          {...barHandlers}
        />
        <div
          className="resize-handle resize-end"
          aria-label={`Resize ${release.releaseNumber} ${label} end date, currently ${shownRange.end}`}
          role="button"
          onPointerDown={(event) => beginResize(event, 'resize-end')}
          {...barHandlers}
        />
        {preview && <span className="drag-tooltip">{formatDragDate(shownRange.start)} – {formatDragDate(shownRange.end)}{preview.offsetDays === 0 ? '' : ` (${preview.offsetDays > 0 ? '+' : ''}${preview.offsetDays}d)`}</span>}
      </div>
    )
  }

  function renderMilestone(release: Release, milestone: MilestoneKey, label: string) {
    const originalDate = release[milestone]
    if (!originalDate) return <span className="unscheduled">Not scheduled</span>
    if (!isValidIsoDate(originalDate)) return <span className="unscheduled">Invalid date</span>
    const preview = milestonePreview?.releaseId === release.id && milestonePreview.milestone === milestone
      ? milestonePreview
      : null
    const shownDate = preview?.date ?? originalDate

    function beginMilestoneDrag(event: ReactPointerEvent<HTMLSpanElement>) {
      if (!timeline || dragPreview || creationPreview) return
      const timelineElement = event.currentTarget.closest<HTMLElement>('.timeline')
      if (!timelineElement) return
      event.currentTarget.setPointerCapture(event.pointerId)
      interactionElementRef.current = event.currentTarget
      const data = event.currentTarget.dataset
      data.pointerId = String(event.pointerId)
      data.startX = String(event.clientX)
      data.originalDate = originalDate
      data.offsetDays = '0'
      data.dragActive = 'false'
      data.timelineWidth = String(timelineElement.getBoundingClientRect().width)
      data.displayedDays = String(timeline.duration / DAY_IN_MS)
    }

    function moveMilestone(event: ReactPointerEvent<HTMLSpanElement>) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
      const data = event.currentTarget.dataset
      const movement = event.clientX - Number(data.startX)
      if (data.dragActive !== 'true' && Math.abs(movement) < 3) return
      data.dragActive = 'true'
      event.preventDefault()
      const offsetDays = Math.round((movement / Number(data.timelineWidth)) * Number(data.displayedDays))
      data.offsetDays = String(offsetDays)
      setMilestonePreview({
        releaseId: release.id,
        milestone,
        date: addDays(data.originalDate ?? '', offsetDays),
        offsetDays,
      })
    }

    function finishMilestone(event: ReactPointerEvent<HTMLSpanElement>, commit: boolean) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
      const data = event.currentTarget.dataset
      event.currentTarget.releasePointerCapture(event.pointerId)
      if (interactionElementRef.current === event.currentTarget) interactionElementRef.current = null
      const offsetDays = Number(data.offsetDays)
      if (commit && data.dragActive === 'true' && offsetDays !== 0) {
        onMilestoneDateUpdate({
          releaseId: release.id,
          milestone,
          date: addDays(data.originalDate ?? '', offsetDays),
        })
      }
      setMilestonePreview(null)
    }

    return (
      <span
        className={`milestone ${milestone} draggable${preview ? ' is-dragging' : ''}`}
        style={{ left: `${position(shownDate)}%` }}
        role="img"
        aria-label={`Move ${label} milestone for release ${release.releaseNumber}, currently ${formatDragDate(shownDate)}`}
        onPointerDown={beginMilestoneDrag}
        onPointerMove={moveMilestone}
        onPointerUp={(event) => finishMilestone(event, true)}
        onPointerCancel={(event) => finishMilestone(event, false)}
      >
        {preview && <span className="milestone-tooltip">{formatDragDate(preview.date)}{preview.offsetDays === 0 ? '' : ` (${preview.offsetDays > 0 ? '+' : ''}${preview.offsetDays}d)`}</span>}
      </span>
    )
  }

  return (
    <section className="panel gantt-panel">
      <div className="print-heading">
        <h1>ShipCommand Release Timeline</h1>
        <p>Printed {formatDragDate(getLocalTodayIso())} · {visible.length} visible release{visible.length === 1 ? '' : 's'} · {showClosed ? 'Closed releases included' : 'Open releases only'}</p>
      </div>
      <div className="gantt-title">
        <div>
          <p className="eyebrow">Master schedule</p>
          <h2>Release timeline</h2>
          <p className="section-description">Phase schedules across all active releases</p>
          <p className={`visible-health-summary${visibleErrors ? ' error' : visibleWarnings ? ' warning' : ' healthy'}`}>
            {visible.length === 0
              ? 'No visible releases'
              : visibleErrors || visibleWarnings
                ? `${visible.length} release${visible.length === 1 ? '' : 's'} · ${visibleErrors} error${visibleErrors === 1 ? '' : 's'} · ${visibleWarnings} warning${visibleWarnings === 1 ? '' : 's'}`
                : 'All visible schedules OK'}
          </p>
          <p className="drag-note">Drag phases to move or resize them; drag empty rows to schedule. Milestones can also be moved.</p>
        </div>
        <div className="gantt-controls">
          <div className="scale-control" aria-label="Timeline scale">
            {(['day', 'week', 'month'] as TimelineScale[]).map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={scale === option}
                onClick={() => changeScale(option)}
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <div className="chart-toolbar">
            <button type="button" className="toolbar-button" disabled={!canUndo} title={undoLabel} aria-label={undoLabel ?? 'Undo last timeline change'} onClick={onUndo}>Undo</button>
            <button type="button" className="toolbar-button" aria-label="Fit timeline and return to the start" onClick={fitTimeline}>Fit Timeline</button>
            <button type="button" className="toolbar-button" disabled={visible.length === 0} aria-label={allVisibleCollapsed ? 'Expand all visible releases' : 'Collapse all visible releases'} onClick={toggleAllVisible}>{allVisibleCollapsed ? 'Expand All' : 'Collapse All'}</button>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={showClosed} onChange={(e) => onShowClosedChange(e.target.checked)} />
            <span className="toggle-track" />
            Show closed
          </label>
        </div>
      </div>
      {!timeline ? (
        <div className="empty-state gantt-empty">No scheduled dates available for the selected releases.</div>
      ) : (
        <>
        <div className="top-scroll-grid">
          <div className="top-scroll-label" />
          <div className="top-scroll" ref={topScrollRef} onScroll={(event) => syncHorizontalScroll(event, 'top')}>
            <div style={{ width: chartWidth, minWidth: '100%' }} />
          </div>
        </div>
        <div className="gantt-shell">
          <div className="gantt-labels">
            <div className="label-header">Release / phase</div>
            {visible.map((release) => {
              const collapsed = collapsedReleaseIds.has(release.id)
              const health = healthByReleaseId.get(release.id)
              return (
                <div className={`label-release${collapsed ? ' is-collapsed' : ''}`} key={release.id}>
                  <div className="release-group-label">
                    <button type="button" className="disclosure-button" aria-label={`${collapsed ? 'Expand' : 'Collapse'} release ${release.releaseNumber}`} onClick={() => toggleRelease(release.id)}>{collapsed ? '›' : '⌄'}</button>
                    <strong>{release.releaseNumber}</strong>
                    {health && <span className={`gantt-health-badge ${health.status}`} aria-label={`${release.releaseNumber}: ${healthLabel(health)}`} title={health.issues[0]?.message}>{health.status === 'healthy' ? 'OK' : `${health.errorCount ? `${health.errorCount}E` : ''}${health.errorCount && health.warningCount ? ' · ' : ''}${health.warningCount ? `${health.warningCount}W` : ''}`}</span>}
                    {collapsed ? <span className="collapsed-prod">{isValidIsoDate(release.prodDate) ? formatDragDate(release.prodDate) : release.prodDate ? 'Invalid PROD' : 'No production date'}</span> : <span>{release.status}</span>}
                  </div>
                  {!collapsed && <>
                    {phaseRows.slice(0, 5).map(({ key, label }) => <div className="phase-label" key={key}><span className={`phase-dot ${key}`} />{label}</div>)}
                    <div className="phase-label"><span className="diamond-mini catReadyDate" />CAT Ready</div>
                    <div className="phase-label"><span className="phase-dot catTesting" />CAT Execution</div>
                    <div className="phase-label"><span className="diamond-mini prodDate" />PROD</div>
                  </>}
                </div>
              )
            })}
          </div>
          <div className="gantt-scroll" ref={timelineScrollRef} onScroll={(event) => syncHorizontalScroll(event, 'timeline')}>
            <div className="timeline" style={{ width: chartWidth, minWidth: '100%' }}>
              <div className="timeline-header">
                <div className="month-row">
                  {(scale === 'month' ? years : months).map((segment) => <div className="month-segment" key={`${segment.label}-${segment.left}`} style={{ left: `${segment.left}%`, width: `${segment.width}%` }}>{segment.label}</div>)}
                </div>
                <div className="week-row">
                  {ticks.map((tick) => <div className="week-label" key={tick.time} style={{ left: `${position(toIsoDate(tick.time))}%` }}>{tick.label}</div>)}
                </div>
                {showToday && <div className="today-header-marker" style={{ left: `${position(today)}%` }} aria-hidden="true"><span>Today</span></div>}
              </div>
              {showToday && <div className="today-marker" style={{ left: `${position(today)}%` }} aria-hidden="true" />}
              <div className="grid-lines">
                {ticks.map((tick) => <span className={tick.major ? 'major' : ''} key={tick.time} style={{ left: `${position(toIsoDate(tick.time))}%` }} />)}
              </div>
              {visible.map((release) => {
                const collapsed = collapsedReleaseIds.has(release.id)
                const summary = releaseScheduleRange(release)
                return (
                  <div className={`timeline-release${collapsed ? ' is-collapsed' : ''}`} key={release.id}>
                    {collapsed ? (
                      <div className="collapsed-summary-row" aria-label={`Collapsed schedule summary for ${release.releaseNumber}${summary ? ` from ${summary.start} to ${summary.end}` : ', not scheduled'}`}>
                        {summary ? <div className="summary-bar" style={{ left: `${position(summary.start)}%`, width: `${Math.max(position(summary.end) - position(summary.start), 0.7)}%` }} /> : <span className="unscheduled">Not scheduled</span>}
                        {isValidIsoDate(release.prodDate) && <span className="milestone prodDate summary-milestone" style={{ left: `${position(release.prodDate)}%` }} />}
                      </div>
                    ) : <>
                      <div className="group-spacer" />
                      {phaseRows.slice(0, 5).map(({ key }) => {
                        const label = phaseRows.find((row) => row.key === key)?.label ?? key
                        return <div className="timeline-row" key={key}>{renderPhaseBar(release, key, label)}</div>
                      })}
                      <div className="timeline-row">{renderMilestone(release, 'catReadyDate', 'CAT Ready')}</div>
                      <div className="timeline-row">{renderPhaseBar(release, 'catTesting', 'CAT Execution')}</div>
                      <div className="timeline-row">{renderMilestone(release, 'prodDate', 'PROD')}</div>
                    </>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        </>
      )}
    </section>
  )
}
