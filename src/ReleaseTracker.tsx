import { useMemo, useState } from 'react';
import { formatRaidId } from './raid';
import { deliveryPhases } from './phases';
import { formatPhaseProgressValue } from './phaseProgress';
import {
  calculateRaidPhaseRollup,
  getPhaseRollupStatusLabel,
  selectAttentionPhases,
  selectReleasePhaseRollups,
} from './releasePhaseSelectors';
import { selectReleaseFeatures, selectReleaseSummaries } from './releaseSelectors';
import { ReleaseScheduleSection } from './ReleaseScheduleSection';
import { releaseScheduleSeed } from './releaseScheduleSeed';
import {
  createInitialScheduleState,
  getReleaseSchedule,
  upsertReleaseSchedule,
} from './releaseSchedules';
import type { DataRecord } from './types';

interface ReleaseTrackerProps {
  records: DataRecord[];
  loadState: 'loading' | 'ready' | 'error';
  onOpenRecord: (record: DataRecord) => void;
}

export function ReleaseTracker({ records, loadState, onOpenRecord }: ReleaseTrackerProps) {
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [releaseSchedules, setReleaseSchedules] = useState(
    () => createInitialScheduleState(releaseScheduleSeed),
  );
  const [unchangedSeedReleaseKeys, setUnchangedSeedReleaseKeys] = useState(
    () => new Set(releaseScheduleSeed.map((schedule) => schedule.releaseId.trim().toLowerCase())),
  );
  const summaries = useMemo(() => selectReleaseSummaries(records), [records]);
  const features = useMemo(
    () => selectedRelease
      ? selectReleaseFeatures(records).filter((feature) => feature.release === selectedRelease)
      : [],
    [records, selectedRelease],
  );
  const unassignedCount = records.filter((record) => !record.release?.trim()).length;
  const phaseRollups = useMemo(
    () => selectedRelease ? selectReleasePhaseRollups(records, selectedRelease) : [],
    [records, selectedRelease],
  );
  const attentionPhases = useMemo(() => selectAttentionPhases(phaseRollups), [phaseRollups]);
  const displayedFeatures = useMemo(
    () => selectedPhaseId
      ? features.filter((feature) => {
        const record = records.find((item) => item.id === feature.raidItemId);
        return record ? calculateRaidPhaseRollup(record, selectedPhaseId).applicableProgressCount > 0 : false;
      })
      : features,
    [features, records, selectedPhaseId],
  );
  const selectedPhaseName = deliveryPhases.find((phase) => phase.id === selectedPhaseId)?.name;
  const selectedSchedule = selectedRelease
    ? getReleaseSchedule(releaseSchedules, selectedRelease)
    : undefined;

  if (selectedRelease) {
    return (
      <section className="board release-detail">
        <div className="board-header">
          <div>
            <button className="text-button" type="button" onClick={() => { setSelectedRelease(null); setSelectedPhaseId(null); }}>← All releases</button>
            <h2>{selectedRelease}</h2>
            <p>{features.length} assigned {features.length === 1 ? 'feature' : 'features'} from the current RAID register.</p>
          </div>
        </div>
        <ReleaseScheduleSection
          key={selectedRelease}
          releaseId={selectedRelease}
          schedule={selectedSchedule}
          isSeedSchedule={unchangedSeedReleaseKeys.has(selectedRelease.trim().toLowerCase())}
          onSave={(updatedSchedule) => {
            setReleaseSchedules((current) => upsertReleaseSchedule(current, updatedSchedule));
            setUnchangedSeedReleaseKeys((current) => {
              const next = new Set(current);
              next.delete(updatedSchedule.releaseId.trim().toLowerCase());
              return next;
            });
          }}
        />
        <div className="phase-summary-section">
          <div className="section-heading">
            <div><h3>Phase Summary</h3><p>Select a phase to filter the release features below.</p></div>
            <button className={`phase-clear ${selectedPhaseId === null ? 'selected' : ''}`} type="button" onClick={() => setSelectedPhaseId(null)}>All phases</button>
          </div>
          <div className="phase-rollup-grid">
            {phaseRollups.map((rollup) => {
              const phase = deliveryPhases.find((item) => item.id === rollup.phaseId);
              const label = getPhaseRollupStatusLabel(rollup.statusId);
              return (
                <button
                  className={`phase-rollup-card phase-status-${rollup.statusId} ${selectedPhaseId === rollup.phaseId ? 'selected' : ''}`}
                  type="button"
                  key={rollup.phaseId}
                  onClick={() => setSelectedPhaseId(rollup.phaseId)}
                  aria-pressed={selectedPhaseId === rollup.phaseId}
                  aria-label={`${phase?.name}: ${label}, ${rollup.averagePercent === null ? 'no applicable work' : formatPhaseProgressValue(rollup.phaseId, rollup.averagePercent)}`}
                >
                  <strong>{phase?.name}</strong>
                  <span className="phase-rollup-result">{label}{rollup.averagePercent === null ? '' : ` · ${formatPhaseProgressValue(rollup.phaseId, rollup.averagePercent)}`}</span>
                  {rollup.applicableProgressCount ? (
                    <small>
                      {rollup.applicableProgressCount} applicable
                      {rollup.blockedCount > 0 && ` · ${rollup.blockedCount} blocked`}
                      {rollup.completeCount > 0 && ` · ${rollup.completeCount} complete`}
                    </small>
                  ) : <small>No applicable work</small>}
                </button>
              );
            })}
          </div>
          <aside className={`attention-summary ${attentionPhases.length ? 'has-attention' : ''}`}>
            <strong>Needs Attention</strong>
            {attentionPhases.length ? (
              <span>{attentionPhases.map((rollup) => {
                const phase = deliveryPhases.find((item) => item.id === rollup.phaseId);
                return `${phase?.name}: ${rollup.blockedCount} blocked`;
              }).join(' · ')}</span>
            ) : <span>No blocked phases.</span>}
          </aside>
        </div>
        <div className="feature-filter-heading">
          <strong>{selectedPhaseName ? `${selectedPhaseName} features` : 'All release features'}</strong>
          <span>{displayedFeatures.length} shown</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>RAID ID</th>
                <th>Priority</th>
                <th>Title</th>
                <th>Status</th>
                <th>Customer / Project</th>
                <th>Services</th>
                <th>{selectedPhaseName ? 'Phase progress' : 'Progress'}</th>
                <th className="open-column"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {displayedFeatures.map((feature) => {
                const record = records.find((item) => item.id === feature.raidItemId);
                const phaseRollup = record && selectedPhaseId ? calculateRaidPhaseRollup(record, selectedPhaseId) : null;
                return (
                  <tr key={feature.raidItemId} onClick={() => record && onOpenRecord(record)}>
                    <td className="raid-id">{record ? formatRaidId(record.raidId) : feature.raidItemId}</td>
                    <td><span className="priority priority-number">{feature.priority}</span></td>
                    <td className="record-title">{feature.title}</td>
                    <td><span className="status-pill">{feature.status}</span></td>
                    <td>{feature.customerProject || '—'}</td>
                    <td className="release-services">
                      {feature.serviceAssignments.length
                        ? feature.serviceAssignments.map((assignment) => (
                          <span key={assignment.microserviceName} title={assignment.phaseNames.join(', ') || 'No phases selected'}>
                            <strong>{assignment.microserviceName}</strong> — {assignment.involvementTypeName} — {assignment.progressStatusName}{assignment.progressPercent === null ? '' : ` · ${assignment.progressPercent}%`}
                          </span>
                        ))
                        : 'Not identified.'}
                      {feature.unknownServiceLabels.length > 0 && (
                        <span className="unmapped-inline">Unmapped: {feature.unknownServiceLabels.join(', ')}</span>
                      )}
                    </td>
                    <td className="progress-cell">
                      {phaseRollup
                        ? <><span>{getPhaseRollupStatusLabel(phaseRollup.statusId)}</span>{phaseRollup.averagePercent === null ? 'N/A' : formatPhaseProgressValue(phaseRollup.phaseId, phaseRollup.averagePercent)}<small>{phaseRollup.applicableProgressCount} services{phaseRollup.blockedCount ? ` · ${phaseRollup.blockedCount} blocked` : ''}</small></>
                        : feature.progressPercent === null ? 'N/A' : `${feature.progressPercent}%`}
                    </td>
                    <td className="row-arrow">›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
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
              <button className="release-row" type="button" key={release.name} onClick={() => setSelectedRelease(release.name)}>
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
