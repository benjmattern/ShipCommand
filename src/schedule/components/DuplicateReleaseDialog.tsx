import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { DuplicateReleaseRequest, Release, ReleaseStatus } from '../types/release'
import { formatDragDate, isValidIsoDate } from '../utils/date'
import { buildDuplicateDraft, getDuplicateDayOffset, getScheduleRange } from '../utils/releaseDuplication'
import { normalizeReleaseNumber } from '../utils/releaseNumber'

interface DuplicateReleaseDialogProps {
  source: Release
  releases: Release[]
  onCreate: (request: DuplicateReleaseRequest) => void
  onCancel: () => void
}

export function DuplicateReleaseDialog({ source, releases, onCreate, onCancel }: DuplicateReleaseDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [releaseNumber, setReleaseNumber] = useState('')
  const [prodDate, setProdDate] = useState(source.prodDate)
  const [status, setStatus] = useState<ReleaseStatus>('open')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const sourceDateValid = isValidIsoDate(source.prodDate)
  const newDateValid = isValidIsoDate(prodDate)

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [onCancel])

  const request: DuplicateReleaseRequest = {
    sourceReleaseId: source.id,
    releaseNumber,
    prodDate,
    status,
  }
  const preview = sourceDateValid && newDateValid ? buildDuplicateDraft(source, request) : null
  const dayOffset = preview ? getDuplicateDayOffset(source, prodDate) : null
  const scheduleRange = preview ? getScheduleRange(preview) : null

  function validate() {
    const nextErrors: Record<string, string> = {}
    const normalized = normalizeReleaseNumber(releaseNumber)
    if (!releaseNumber.trim()) nextErrors.releaseNumber = 'New release number is required.'
    else if (releases.some((release) => normalizeReleaseNumber(release.releaseNumber) === normalized)) {
      nextErrors.releaseNumber = 'A release with this number already exists.'
    }
    if (!prodDate) nextErrors.prodDate = 'New production date is required.'
    else if (!newDateValid) nextErrors.prodDate = 'Enter a valid production date.'
    if (!sourceDateValid) nextErrors.source = 'The source release does not have a valid production date.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) return
    onCreate({ ...request, releaseNumber: releaseNumber.trim() })
  }

  function shiftLabel() {
    if (dayOffset === null) return 'Unavailable'
    if (dayOffset === 0) return 'No date shift'
    return `${dayOffset > 0 ? '+' : ''}${dayOffset} days`
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <div className="duplicate-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="duplicate-title" tabIndex={-1}>
        <div className="duplicate-heading">
          <div>
            <p className="eyebrow">Schedule template</p>
            <h2 id="duplicate-title">Duplicate release</h2>
          </div>
          <button type="button" className="dialog-close" aria-label="Close duplicate release dialog" onClick={onCancel}>×</button>
        </div>
        <p className="duplicate-description">All populated dates will shift by the difference between the current and new PROD dates.</p>
        <form onSubmit={handleSubmit}>
          <div className="duplicate-grid">
            <label><span>Source release</span><input value={source.releaseNumber} readOnly /></label>
            <label>
              <span>New release number <b>*</b></span>
              <input value={releaseNumber} autoFocus onChange={(event) => setReleaseNumber(event.target.value)} aria-describedby={errors.releaseNumber ? 'duplicate-number-error' : undefined} />
              {errors.releaseNumber && <small id="duplicate-number-error" className="error">{errors.releaseNumber}</small>}
            </label>
            <label>
              <span>New production date <b>*</b></span>
              <input type="date" value={prodDate} onChange={(event) => setProdDate(event.target.value)} aria-describedby={errors.prodDate ? 'duplicate-date-error' : undefined} />
              {errors.prodDate && <small id="duplicate-date-error" className="error">{errors.prodDate}</small>}
            </label>
            <label>
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as ReleaseStatus)}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>
          {!sourceDateValid && <p className="dialog-error">The source release does not have a valid production date. Duplication is unavailable until it is corrected.</p>}
          <section className="duplicate-preview" aria-live="polite">
            <h3>Shifted schedule preview</h3>
            <dl>
              <div><dt>Date shift</dt><dd>{shiftLabel()}</dd></div>
              <div><dt>CAT Ready</dt><dd>{preview?.catReadyDate ? formatDragDate(preview.catReadyDate) : 'Not scheduled'}</dd></div>
              <div><dt>PROD</dt><dd>{preview?.prodDate ? formatDragDate(preview.prodDate) : 'Unavailable'}</dd></div>
              <div><dt>Overall range</dt><dd>{scheduleRange ? `${formatDragDate(scheduleRange.start)} – ${formatDragDate(scheduleRange.end)}` : 'Not scheduled'}</dd></div>
            </dl>
          </section>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="button primary" disabled={!sourceDateValid}>Create Duplicate</button>
          </div>
        </form>
      </div>
    </div>
  )
}
