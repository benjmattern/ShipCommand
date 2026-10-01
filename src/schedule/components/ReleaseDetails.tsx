import type { DateRange, Release, ReleaseScheduleHealth } from '../types/release'
import { differenceInDays, formatDragDate, isValidIsoDate } from '../utils/date'
import { healthLabel } from '../utils/releaseScheduleValidation'

interface ReleaseDetailsProps {
  release: Release | null
  hasReleases: boolean
  onEdit: (release: Release) => void
  onAdd: () => void
  health?: ReleaseScheduleHealth
}

const phases: { key: keyof Pick<Release, 'requirements' | 'devUt' | 'sit' | 'e2e' | 'regression' | 'catTesting'>; label: string }[] = [
  { key: 'requirements', label: 'Requirements / Writing' },
  { key: 'devUt', label: 'DEV/UT' },
  { key: 'sit', label: 'SIT' },
  { key: 'e2e', label: 'E2E' },
  { key: 'regression', label: 'Regression' },
  { key: 'catTesting', label: 'CAT Execution' },
]

function displayDate(date: string) {
  if (!date) return 'Not scheduled'
  return isValidIsoDate(date) ? formatDragDate(date) : 'Invalid date'
}

interface RangeDisplay {
  start: string
  end: string
  duration: string
}

function rangeDisplay(range: DateRange): RangeDisplay {
  const validStart = isValidIsoDate(range.start)
  const validEnd = isValidIsoDate(range.end)
  if (validStart && validEnd) {
    const duration = range.end >= range.start ? differenceInDays(range.start, range.end) + 1 : null
    return {
      start: displayDate(range.start),
      end: displayDate(range.end),
      duration: duration === null ? '—' : `${duration} day${duration === 1 ? '' : 's'}`,
    }
  }
  if (!range.start && !range.end) return { start: 'Not scheduled', end: '—', duration: '—' }
  return {
    start: range.start ? displayDate(range.start) : '—',
    end: range.end ? displayDate(range.end) : '—',
    duration: validStart && !range.end ? 'Ongoing' : !range.start && validEnd ? 'Partial' : '—',
  }
}

export function ReleaseDetails({ release, health, hasReleases, onEdit, onAdd }: ReleaseDetailsProps) {
  if (!release) {
    return (
      <section className="panel details-panel" aria-labelledby="release-details-title">
        <div className="panel-heading"><div><p className="eyebrow">Selected release</p><h2 id="release-details-title">Release Details</h2></div></div>
        <div className="details-empty">
          <h3>{hasReleases ? 'Select a release' : 'No releases yet'}</h3>
          <p>{hasReleases ? 'Select a release to view its schedule.' : 'Create a release to begin building the timeline.'}</p>
          {!hasReleases && <button type="button" className="button primary" onClick={onAdd}>Add Release</button>}
        </div>
      </section>
    )
  }

  return (
    <section className="panel details-panel" aria-labelledby="release-details-title">
      <div className="details-header">
        <div>
          <p className="eyebrow">Selected release</p>
          <div className="details-title-line">
            <h2 id="release-details-title">{release.releaseNumber}</h2>
            <span className={`status-pill ${release.status}`}>{release.status}</span>
          </div>
          <p className="details-prod">Production · {displayDate(release.prodDate)}</p>
        </div>
        <button type="button" className="button secondary" onClick={() => onEdit(release)}>Edit Release</button>
      </div>
      {health && (
        <section className={`schedule-health ${health.status}`} aria-labelledby="schedule-health-title">
          <div className="health-heading">
            <h3 id="schedule-health-title">Schedule Health</h3>
            <span className={`health-badge ${health.status}`}>{healthLabel(health)}</span>
          </div>
          {health.issues.length === 0 ? <p>No schedule conflicts detected.</p> : (
            <ul>
              {health.issues.map((issue) => <li className={issue.severity} key={issue.id}><strong>{issue.severity === 'error' ? 'Error' : 'Warning'}</strong><span>{issue.message}</span></li>)}
            </ul>
          )}
        </section>
      )}
      <div className="schedule-table-heading">Release Schedule</div>
      <div className="release-schedule-wrap">
        <table className="release-schedule-table">
          <caption>Schedule for release {release.releaseNumber}</caption>
          <colgroup><col className="phase-column" /><col /><col /><col className="duration-column" /></colgroup>
          <thead>
            <tr><th scope="col">Phase</th><th scope="col">Start / Date</th><th scope="col">End</th><th scope="col">Duration</th></tr>
          </thead>
          <tbody>
            {phases.slice(0, 5).map(({ key, label }) => {
              const values = rangeDisplay(release[key])
              return (
                <tr key={key}>
                  <th scope="row" data-label="Phase"><span className={`phase-dot ${key}`} />{label}</th>
                  <td data-label="Start / Date">{values.start}</td>
                  <td data-label="End">{values.end}</td>
                  <td data-label="Duration">{values.duration}</td>
                </tr>
              )
            })}
            <tr className="milestone-row">
              <th scope="row" data-label="Phase"><span className="diamond-mini catReadyDate" />CAT Ready</th>
              <td data-label="Start / Date">{displayDate(release.catReadyDate)}</td>
              <td data-label="End">—</td>
              <td data-label="Duration">Milestone</td>
            </tr>
            {(() => {
              const values = rangeDisplay(release.catTesting)
              return (
                <tr>
                  <th scope="row" data-label="Phase"><span className="phase-dot catTesting" />CAT Execution</th>
                  <td data-label="Start / Date">{values.start}</td>
                  <td data-label="End">{values.end}</td>
                  <td data-label="Duration">{values.duration}</td>
                </tr>
              )
            })()}
            <tr className="milestone-row">
              <th scope="row" data-label="Phase"><span className="diamond-mini prodDate" />PROD</th>
              <td data-label="Start / Date">{displayDate(release.prodDate)}</td>
              <td data-label="End">—</td>
              <td data-label="Duration">Milestone</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="details-meta">Created {release.createdAt ? new Date(release.createdAt).toLocaleDateString() : 'Unknown'} · Updated {release.updatedAt ? new Date(release.updatedAt).toLocaleDateString() : 'Unknown'}</div>
    </section>
  )
}
