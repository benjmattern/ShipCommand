import { deliveryPhases } from './phases';
import { useState } from 'react';
import { ReleaseScheduleEditor } from './ReleaseScheduleEditor';
import { formatScheduleRange } from './scheduleDisplay';
import type { ReleaseSchedule } from './releaseScheduleTypes';

interface ReleaseScheduleSectionProps {
  releaseId: string;
  schedule?: ReleaseSchedule;
  isSeedSchedule: boolean;
  onSave: (schedule: ReleaseSchedule) => void;
}

export function ReleaseScheduleSection({
  releaseId,
  schedule,
  isSeedSchedule,
  onSave,
}: ReleaseScheduleSectionProps) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="release-schedule-section" aria-labelledby="release-schedule-heading">
      <div className="section-heading schedule-heading">
        <div>
          <h3 id="release-schedule-heading">Schedule</h3>
          {isSeedSchedule && <p>Sample planning dates for proof-of-concept use.</p>}
        </div>
        <button className="secondary-button schedule-edit-button" type="button" onClick={() => setEditing(true)}>
          Edit schedule
        </button>
      </div>

      {!schedule ? (
        <p className="schedule-empty">No release schedule has been defined.</p>
      ) : (
        <>
          <div className="release-window">
            <span>Release window</span>
            <strong>{formatScheduleRange(schedule.plannedStartDate, schedule.plannedEndDate)}</strong>
          </div>
          <dl className="phase-schedule-list">
            {schedule.phaseSchedules.map((phaseSchedule) => {
              const phase = deliveryPhases.find((item) => item.id === phaseSchedule.phaseId);
              return (
                <div className="phase-schedule-row" key={phaseSchedule.phaseId}>
                  <dt>{phase?.name ?? phaseSchedule.phaseId}</dt>
                  <dd>{formatScheduleRange(phaseSchedule.plannedStartDate, phaseSchedule.plannedEndDate)}</dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
      {editing && (
        <ReleaseScheduleEditor
          releaseId={releaseId}
          schedule={schedule}
          onCancel={() => setEditing(false)}
          onSave={(updatedSchedule) => {
            onSave(updatedSchedule);
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}
