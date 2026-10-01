import { useState, type FormEvent } from 'react'
import type { DateRange, Release, ReleaseDraft } from '../types/release'
import { normalizeReleaseNumber } from '../utils/releaseNumber'
import { healthLabel, validateReleaseSchedule } from '../utils/releaseScheduleValidation'

interface ReleaseFormProps {
  editingRelease: Release | null
  releases: Release[]
  onSubmit: (draft: ReleaseDraft) => void
  onCancel: () => void
}

const emptyDraft: ReleaseDraft = {
  releaseNumber: '',
  prodDate: '',
  status: 'open',
  requirements: { start: '', end: '' },
  devUt: { start: '', end: '' },
  sit: { start: '', end: '' },
  e2e: { start: '', end: '' },
  regression: { start: '', end: '' },
  catReadyDate: '',
  catTesting: { start: '', end: '' },
}

const ranges: { key: keyof Pick<ReleaseDraft, 'requirements' | 'devUt' | 'sit' | 'e2e' | 'regression' | 'catTesting'>; label: string }[] = [
  { key: 'requirements', label: 'Requirements / Writing' },
  { key: 'devUt', label: 'DEV/UT' },
  { key: 'sit', label: 'SIT' },
  { key: 'e2e', label: 'E2E' },
  { key: 'regression', label: 'Regression' },
  { key: 'catTesting', label: 'CAT Execution' },
]

function copyDraft(release?: Release | null): ReleaseDraft {
  if (!release) return { ...emptyDraft, requirements: { ...emptyDraft.requirements }, devUt: { ...emptyDraft.devUt }, sit: { ...emptyDraft.sit }, e2e: { ...emptyDraft.e2e }, regression: { ...emptyDraft.regression }, catTesting: { ...emptyDraft.catTesting } }
  return {
    releaseNumber: release.releaseNumber,
    prodDate: release.prodDate,
    status: release.status,
    requirements: { ...release.requirements },
    devUt: { ...release.devUt },
    sit: { ...release.sit },
    e2e: { ...release.e2e },
    regression: { ...release.regression },
    catReadyDate: release.catReadyDate,
    catTesting: { ...release.catTesting },
  }
}

export function ReleaseForm({ editingRelease, releases, onSubmit, onCancel }: ReleaseFormProps) {
  const [draft, setDraft] = useState<ReleaseDraft>(() => copyDraft(editingRelease))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const draftHealth = validateReleaseSchedule({
    ...draft,
    id: editingRelease?.id ?? 'draft',
    createdAt: editingRelease?.createdAt ?? '',
    updatedAt: editingRelease?.updatedAt ?? '',
  })
  const draftWarnings = draftHealth.issues.filter((issue) => issue.severity === 'warning')

  function setRange(key: typeof ranges[number]['key'], field: keyof DateRange, value: string) {
    setDraft((current) => ({ ...current, [key]: { ...current[key], [field]: value } }))
  }

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!draft.releaseNumber.trim()) nextErrors.releaseNumber = 'Release number is required.'
    else if (releases.some((release) =>
      release.id !== editingRelease?.id &&
      normalizeReleaseNumber(release.releaseNumber) === normalizeReleaseNumber(draft.releaseNumber),
    )) nextErrors.releaseNumber = 'A release with this number already exists.'
    if (!draft.prodDate) nextErrors.prodDate = 'Production date is required.'
    ranges.forEach(({ key, label }) => {
      const range = draft[key]
      if (range.start && range.end && range.end < range.start) {
        nextErrors[key] = `${label} end date cannot be earlier than its start date.`
      }
    })
    const scheduleErrors = draftHealth.issues.filter((issue) =>
      issue.severity === 'error' &&
      issue.code !== 'phase-end-before-start' &&
      !(issue.code === 'invalid-date' && issue.message.startsWith('PROD') && !draft.prodDate),
    )
    if (scheduleErrors.length) nextErrors.schedule = scheduleErrors.map((issue) => issue.message).join(' ')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) return
    onSubmit({ ...draft, releaseNumber: draft.releaseNumber.trim() })
    if (!editingRelease) setDraft(copyDraft())
  }

  return (
      <form className="release-form" onSubmit={handleSubmit}>
        <div className="form-section-heading">Release information</div>
        <div className="form-grid essentials">
          <label>
            <span>Release number <b>*</b></span>
            <input value={draft.releaseNumber} onChange={(e) => setDraft({ ...draft, releaseNumber: e.target.value })} placeholder="e.g. R32.0.0.0" />
            {errors.releaseNumber && <small className="error">{errors.releaseNumber}</small>}
          </label>
          <label>
            <span>Production date <b>*</b></span>
            <input type="date" value={draft.prodDate} onChange={(e) => setDraft({ ...draft, prodDate: e.target.value })} />
            {errors.prodDate && <small className="error">{errors.prodDate}</small>}
          </label>
          <label>
            <span>Status</span>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ReleaseDraft['status'] })}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>

        <div className="schedule-heading">
          <h3>Phase schedule</h3>
          <span>Dates are optional</span>
        </div>
        <div className="phase-fields">
          {ranges.map(({ key, label }) => (
            <fieldset key={key}>
              <legend><span className={`phase-dot ${key}`} />{label}</legend>
              <div className="date-pair">
                <label><span>Start</span><input type="date" value={draft[key].start} onChange={(e) => setRange(key, 'start', e.target.value)} /></label>
                <label><span>End</span><input type="date" value={draft[key].end} onChange={(e) => setRange(key, 'end', e.target.value)} /></label>
              </div>
              {errors[key] && <small className="error">{errors[key]}</small>}
            </fieldset>
          ))}
          <fieldset>
            <legend><span className="phase-dot catReadyDate" />CAT Ready</legend>
            <label><span>Milestone date</span><input type="date" value={draft.catReadyDate} onChange={(e) => setDraft({ ...draft, catReadyDate: e.target.value })} /></label>
          </fieldset>
        </div>
        <div className="form-actions">
          <div className="form-health-messages">
            {errors.schedule && <p className="form-schedule-error"><strong>Schedule errors</strong>{errors.schedule}</p>}
            {draftWarnings.length > 0 && <div className="form-schedule-warning"><strong>Schedule warnings · {healthLabel(draftHealth)}</strong><ul>{draftWarnings.map((issue) => <li key={issue.id}>{issue.message}</li>)}</ul></div>}
          </div>
          {editingRelease && <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>}
          <button type="submit" className="button primary">{editingRelease ? 'Save Changes' : 'Create Release'}</button>
        </div>
      </form>
  )
}
