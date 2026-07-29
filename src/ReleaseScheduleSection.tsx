import { deliveryPhases } from './phases';
import { releaseScheduleSeed } from './releaseScheduleSeed';
import { getReleaseSchedule } from './releaseSchedules';
import { formatScheduleRange } from './scheduleDisplay';

interface ReleaseScheduleSectionProps {
  releaseId: string;
}

export function ReleaseScheduleSection({ releaseId }: ReleaseScheduleSectionProps) {
  const schedule = getReleaseSchedule(releaseScheduleSeed, releaseId);

  return (
    <section className="release-schedule-section" aria-labelledby="release-schedule-heading">
      <div className="section-heading schedule-heading">
        <div>
          <h3 id="release-schedule-heading">Schedule</h3>
          {schedule && <p>Sample planning dates for proof-of-concept use.</p>}
        </div>
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
    </section>
  );
}
