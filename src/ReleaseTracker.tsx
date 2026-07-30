import { useMemo, useState } from 'react';
import { ReleaseWorkspace } from './releases/ReleaseWorkspace';
import { createReleaseId } from './releases/Release';
import type { ReleaseStore } from './releases/releaseTypes';
import { selectReleaseSummaries } from './releaseSelectors';
import { releaseScheduleSeed } from './releaseScheduleSeed';
import {
  createInitialScheduleState,
  getReleaseSchedule,
  upsertReleaseSchedule,
} from './releaseSchedules';
import type { DataRecord } from './types';

interface ReleaseTrackerProps {
  records: DataRecord[];
  releaseStore: ReleaseStore;
  loadState: 'loading' | 'ready' | 'error';
  onOpenRecord: (record: DataRecord) => void;
  onOpenVersionOne: () => void;
  onOpenRaid: (releaseId: string) => void;
}

export function ReleaseTracker({
  records,
  releaseStore,
  loadState,
  onOpenRecord,
  onOpenVersionOne,
  onOpenRaid,
}: ReleaseTrackerProps) {
  const [releaseSchedules, setReleaseSchedules] = useState(
    () => createInitialScheduleState(releaseScheduleSeed),
  );
  const [unchangedSeedReleaseKeys, setUnchangedSeedReleaseKeys] = useState(
    () => new Set(releaseScheduleSeed.map((schedule) => schedule.releaseId.trim().toLowerCase())),
  );
  const summaries = useMemo(() => selectReleaseSummaries(records), [records]);
  const unassignedCount = records.filter((record) => !record.release?.trim()).length;

  if (releaseStore.selectedRelease) {
    const selectedRelease = releaseStore.selectedRelease;
    return (
      <ReleaseWorkspace
        key={selectedRelease.id}
        release={selectedRelease}
        records={records}
        schedule={getReleaseSchedule(releaseSchedules, selectedRelease.name)}
        isSeedSchedule={unchangedSeedReleaseKeys.has(selectedRelease.name.toLowerCase())}
        onBack={() => releaseStore.selectRelease(null)}
        onUpdateRelease={(update) => releaseStore.updateRelease(selectedRelease.id, update)}
        onOpenRecord={onOpenRecord}
        onOpenVersionOne={onOpenVersionOne}
        onOpenRaid={() => onOpenRaid(selectedRelease.name)}
        onSaveSchedule={(updatedSchedule) => {
          setReleaseSchedules((current) => upsertReleaseSchedule(current, updatedSchedule));
          setUnchangedSeedReleaseKeys((current) => {
            const next = new Set(current);
            next.delete(updatedSchedule.releaseId.trim().toLowerCase());
            return next;
          });
        }}
      />
    );
  }

  return (
    <>
      <section className="release-summary-bar" aria-label="Release tracker summary">
        <div><strong>{summaries.length}</strong><span>Tracked releases</span></div>
        <div><strong>{records.length - unassignedCount}</strong><span>Assigned features</span></div>
        <div><strong>{unassignedCount}</strong><span>Unassigned RAID items</span></div>
      </section>

      {loadState === 'loading' && <p className="empty-state standalone">Loading releases from BacklogData.xlsx…</p>}
      {loadState === 'error' && <p className="empty-state error-state standalone">Release data could not be loaded.</p>}
      {loadState === 'ready' && (
        <section className="release-list-panel" aria-label="Releases">
          <div className="release-list-header" aria-hidden="true">
            <span>Release</span><span>Progress</span><span>Features</span><span>Completed</span><span>Remaining</span><span>Phase summary</span><span />
          </div>
          <div className="release-list">
            {summaries.map((release) => (
              <button className="release-row" type="button" key={release.name} onClick={() => releaseStore.selectRelease(createReleaseId(release.name))}>
                <strong className="release-row-name">{release.name}</strong>
                <span className="release-row-progress"><small>Progress</small>{release.progressPercent === null ? 'N/A' : `${release.progressPercent}%`}</span>
                <span className="release-row-metric"><small>Features</small><b>{release.featureCount}</b></span>
                <span className="release-row-metric"><small>Completed</small><b>{release.completedCount}</b></span>
                <span className="release-row-metric"><small>Remaining</small><b>{release.remainingCount}</b></span>
                <span className="release-row-phases" aria-label={`${release.phaseSummary.blockedPhases} blocked phases, ${release.phaseSummary.completePhases} complete phases, ${release.phaseSummary.activePhases} active phases`}>
                  <span className={release.phaseSummary.blockedPhases ? 'has-blocked' : ''}>{release.phaseSummary.blockedPhases} blocked</span>
                  <span>{release.phaseSummary.completePhases} complete</span>
                  <span>{release.phaseSummary.activePhases} active</span>
                </span>
                <span className="release-row-arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
