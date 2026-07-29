import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { deliveryPhases } from './phases';
import {
  clearReleaseScheduleDates,
  createEmptyReleaseSchedule,
  validateReleaseSchedule,
} from './releaseSchedules';
import type { IsoDate, ReleaseSchedule, ScheduleValidationIssue } from './releaseScheduleTypes';

interface ReleaseScheduleEditorProps {
  releaseId: string;
  schedule?: ReleaseSchedule;
  onCancel: () => void;
  onSave: (schedule: ReleaseSchedule) => void;
}

function inputDate(value: string): IsoDate | null {
  return value || null;
}

function issueMessage(issue: ScheduleValidationIssue) {
  if (issue.code === 'release-date-order') return 'Release start date cannot be after the end date.';
  if (issue.code === 'phase-date-order') {
    const phaseName = deliveryPhases.find((phase) => phase.id === issue.phaseId)?.name ?? 'Phase';
    return `${phaseName} start date cannot be after its end date.`;
  }
  return issue.message;
}

export function ReleaseScheduleEditor({
  releaseId,
  schedule,
  onCancel,
  onSave,
}: ReleaseScheduleEditorProps) {
  const [draft, setDraft] = useState<ReleaseSchedule>(
    () => schedule
      ? {
        ...schedule,
        phaseSchedules: schedule.phaseSchedules.map((phaseSchedule) => ({ ...phaseSchedule })),
      }
      : createEmptyReleaseSchedule(releaseId),
  );
  const [issues, setIssues] = useState<ScheduleValidationIssue[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  function updateReleaseDate(field: 'plannedStartDate' | 'plannedEndDate', value: string) {
    setDraft((current) => ({ ...current, [field]: inputDate(value) }));
    setIssues([]);
  }

  function updatePhaseDate(
    phaseId: string,
    field: 'plannedStartDate' | 'plannedEndDate',
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      phaseSchedules: current.phaseSchedules.map((phaseSchedule) => (
        phaseSchedule.phaseId === phaseId
          ? { ...phaseSchedule, [field]: inputDate(value) }
          : phaseSchedule
      )),
    }));
    setIssues([]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const validationIssues = validateReleaseSchedule(draft);
    setIssues(validationIssues);
    if (validationIssues.length === 0) onSave(draft);
  }

  function clearDates() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setDraft((current) => clearReleaseScheduleDates(current));
    setIssues([]);
    setConfirmClear(false);
  }

  const releaseIssues = issues.filter((issue) => issue.scope !== 'phase');

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="modal schedule-editor-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-editor-title">
        <button className="modal-close" type="button" aria-label="Close schedule editor" onClick={onCancel}>×</button>
        <form onSubmit={submit}>
          <div className="modal-heading">
            <p>Release planning</p>
            <h2 id="schedule-editor-title">Edit schedule for {releaseId}</h2>
            <span className="schedule-session-note">Schedule changes are stored for this session only.</span>
          </div>

          <div className="schedule-editor-body">
            {issues.length > 0 && (
              <div className="schedule-validation-summary" role="alert">
                <strong>Correct the highlighted schedule dates before saving.</strong>
              </div>
            )}

            <fieldset className="schedule-fieldset">
              <legend>Release window</legend>
              <div className="schedule-date-fields">
                <label>
                  Planned start
                  <input
                    type="date"
                    autoFocus
                    value={draft.plannedStartDate ?? ''}
                    onChange={(event) => updateReleaseDate('plannedStartDate', event.target.value)}
                    aria-invalid={releaseIssues.length > 0}
                  />
                </label>
                <label>
                  Planned end
                  <input
                    type="date"
                    value={draft.plannedEndDate ?? ''}
                    onChange={(event) => updateReleaseDate('plannedEndDate', event.target.value)}
                    aria-invalid={releaseIssues.length > 0}
                  />
                </label>
              </div>
              {releaseIssues.map((issue) => <p className="schedule-field-error" key={issue.code}>{issueMessage(issue)}</p>)}
            </fieldset>

            <fieldset className="schedule-fieldset">
              <legend>Phase schedule</legend>
              <div className="schedule-phase-editor">
                {draft.phaseSchedules.map((phaseSchedule) => {
                  const phase = deliveryPhases.find((item) => item.id === phaseSchedule.phaseId);
                  const phaseIssues = issues.filter((issue) => issue.phaseId === phaseSchedule.phaseId);
                  return (
                    <div className="schedule-phase-editor-row" key={phaseSchedule.phaseId}>
                      <strong>{phase?.name ?? phaseSchedule.phaseId}</strong>
                      <label>
                        Planned start
                        <input
                          type="date"
                          value={phaseSchedule.plannedStartDate ?? ''}
                          onChange={(event) => updatePhaseDate(phaseSchedule.phaseId, 'plannedStartDate', event.target.value)}
                          aria-invalid={phaseIssues.length > 0}
                        />
                      </label>
                      <label>
                        Planned end
                        <input
                          type="date"
                          value={phaseSchedule.plannedEndDate ?? ''}
                          onChange={(event) => updatePhaseDate(phaseSchedule.phaseId, 'plannedEndDate', event.target.value)}
                          aria-invalid={phaseIssues.length > 0}
                        />
                      </label>
                      {phaseIssues.map((issue) => (
                        <p className="schedule-field-error" key={`${issue.phaseId}-${issue.code}`}>{issueMessage(issue)}</p>
                      ))}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="modal-footer modal-footer-split">
            <div className="clear-schedule-actions">
              <button className="danger-button" type="button" onClick={clearDates}>
                {confirmClear ? 'Confirm clear schedule' : 'Clear schedule'}
              </button>
              {confirmClear && <button className="secondary-button" type="button" onClick={() => setConfirmClear(false)}>Keep dates</button>}
            </div>
            <div>
              <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
              <button className="primary-button" type="submit">Save schedule</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
