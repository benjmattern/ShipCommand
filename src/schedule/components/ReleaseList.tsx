import type { Release, ReleaseScheduleHealth } from '../types/release'
import { compareReleaseNumbers } from '../utils/releaseNumber'
import { isValidIsoDate, parseIsoDateUtc } from '../utils/date'
import { healthLabel } from '../utils/releaseScheduleValidation'

interface ReleaseListProps {
  releases: Release[]
  selectedReleaseId: string | null
  onSelect: (release: Release) => void
  onAdd: () => void
  onEdit: (release: Release) => void
  onDelete: (release: Release) => void
  onToggleStatus: (release: Release) => void
  onDuplicate: (release: Release) => void
  healthByReleaseId: Map<string, ReleaseScheduleHealth>
}

function formatDate(date: string) {
  if (!isValidIsoDate(date)) return 'Invalid date'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(parseIsoDateUtc(date)))
}

export function ReleaseList({ releases, healthByReleaseId, selectedReleaseId, onSelect, onAdd, onEdit, onDelete, onToggleStatus, onDuplicate }: ReleaseListProps) {
  const sortedReleases = [...releases].sort(compareReleaseNumbers)

  return (
    <section className="panel list-panel">
      <div className="panel-heading list-heading">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h2>Saved releases</h2>
        </div>
        <div className="list-heading-actions"><span className="count-badge">{releases.length}</span><button type="button" className="button primary" onClick={onAdd}>Add Release</button></div>
      </div>
      <div className="release-list">
        {releases.length === 0 && <div className="empty-state">No releases yet. Add your first release to begin planning.</div>}
        {sortedReleases.map((release) => {
          const health = healthByReleaseId.get(release.id)
          return (
          <article
            className={`release-card selectable${selectedReleaseId === release.id ? ' is-selected' : ''}`}
            key={release.id}
            role="button"
            tabIndex={0}
            aria-current={selectedReleaseId === release.id ? 'true' : undefined}
            onClick={() => onSelect(release)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(release)
              }
            }}
          >
            <div className="release-main">
              <span className={`status-dot ${release.status}`} />
              <div>
                <h3>{release.releaseNumber}</h3>
                <p>Production · {formatDate(release.prodDate)}</p>
                {health && <span className={`health-badge ${health.status}`} title={health.issues[0]?.message}>{healthLabel(health)}</span>}
              </div>
              <span className={`status-pill ${release.status}`}>{release.status}</span>
              {selectedReleaseId === release.id && <span className="selected-indicator">Selected</span>}
            </div>
            <div className="release-actions">
              <button className="text-button" type="button" onClick={(event) => { event.stopPropagation(); onToggleStatus(release) }}>
                Mark {release.status === 'open' ? 'closed' : 'open'}
              </button>
              <div>
                <button className="icon-button" type="button" onClick={(event) => { event.stopPropagation(); onDuplicate(release) }} aria-label={`Duplicate release ${release.releaseNumber}`}>Duplicate</button>
                <button className="icon-button" type="button" onClick={(event) => { event.stopPropagation(); onSelect(release); onEdit(release) }} aria-label={`Edit ${release.releaseNumber}`}>Edit</button>
                <button className="icon-button danger" type="button" onClick={(event) => { event.stopPropagation(); onDelete(release) }} aria-label={`Delete ${release.releaseNumber}`}>Delete</button>
              </div>
            </div>
          </article>
          )
        })}
      </div>
    </section>
  )
}
