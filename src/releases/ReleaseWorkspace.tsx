import { useMemo, useState } from 'react';
import { formatRaidId } from '../raid';
import { deliveryPhases } from '../phases';
import { formatPhaseProgressValue } from '../phaseProgress';
import {
  calculateRaidPhaseRollup,
  getPhaseRollupStatusLabel,
  selectAttentionPhases,
  selectReleasePhaseRollups,
} from '../releasePhaseSelectors';
import { selectReleaseFeatures, selectReleaseSummaries } from '../releaseSelectors';
import { ReleaseScheduleSection } from '../ReleaseScheduleSection';
import type { ReleaseSchedule } from '../releaseScheduleTypes';
import type { DataRecord } from '../types';
import { ReleaseOverview } from './components/ReleaseOverview';
import { ServiceNowReleaseIdentity } from './components/ServiceNowReleaseIdentity';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { WorkspacePanel } from './components/WorkspacePanel';
import type { Release, ReleaseMetadataUpdate } from './releaseTypes';

interface ReleaseWorkspaceProps {
  release: Release;
  records: DataRecord[];
  schedule?: ReleaseSchedule;
  isSeedSchedule: boolean;
  onSaveSchedule: (schedule: ReleaseSchedule) => void;
  onBack: () => void;
  onUpdateRelease: (update: ReleaseMetadataUpdate) => void;
  onOpenRecord: (record: DataRecord) => void;
  onOpenVersionOne: () => void;
  onOpenRaid: () => void;
}

export function ReleaseWorkspace({
  release,
  records,
  schedule,
  isSeedSchedule,
  onSaveSchedule,
  onBack,
  onUpdateRelease,
  onOpenRecord,
  onOpenVersionOne,
  onOpenRaid,
}: ReleaseWorkspaceProps) {
  const releaseId = release.name;
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const features = useMemo(
    () => selectReleaseFeatures(records).filter((feature) => feature.release === releaseId),
    [records, releaseId],
  );
  const releaseSummary = useMemo(
    () => selectReleaseSummaries(records).find((summary) => summary.name === releaseId),
    [records, releaseId],
  );
  const phaseRollups = useMemo(
    () => selectReleasePhaseRollups(records, releaseId),
    [records, releaseId],
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
  const progressPercent = releaseSummary?.progressPercent ?? null;

  return (
    <section className="release-workspace">
      <WorkspaceHeader
        release={release}
        progressPercent={progressPercent}
        onBack={onBack}
      />

      <div className="workspace-panels">
        <WorkspacePanel
          title="Overview"
          health="healthy"
          summary={`${release.raidCount} RAID ${release.raidCount === 1 ? 'feature' : 'features'}`}
          defaultExpanded
        >
          <ReleaseOverview release={release} progressPercent={progressPercent} />
        </WorkspacePanel>

        <WorkspacePanel
          title="VersionOne"
          health="healthy"
          summary={`Stories ${release.storyCount ?? '—'} · Defects ${release.defectCount ?? '—'}`}
          actions={(
            <>
              <button className="secondary-button" type="button" disabled title="Load a release in the Story Explorer first">Refresh</button>
              <button className="secondary-button" type="button" onClick={onOpenVersionOne}>Open Explorer</button>
            </>
          )}
        >
          <dl className="workspace-integration-summary">
            <div><dt>VersionOne Release</dt><dd>{release.versionOneRelease ?? 'Not mapped'}</dd></div>
            <div><dt>Story Count</dt><dd>{release.storyCount ?? '—'}</dd></div>
            <div><dt>Defect Count</dt><dd>{release.defectCount ?? '—'}</dd></div>
            <div><dt>Last Refresh</dt><dd>{release.lastRefresh ?? 'Not recorded'}</dd></div>
          </dl>
          <p className="workspace-note">VersionOne data remains session-only in the Story Explorer and is not duplicated in the workspace.</p>
        </WorkspacePanel>

        <WorkspacePanel
          title="ServiceNow"
          health={release.tslcProjectId ? 'pending' : 'not-configured'}
          summary={release.tslcProjectId ?? 'TSLC Project not configured'}
        >
          <ServiceNowReleaseIdentity
            release={release}
            onSave={(tslcProjectId) => onUpdateRelease({ tslcProjectId })}
          />
          <p className="workspace-note">This stores Release identity only. No ServiceNow request is made.</p>
        </WorkspacePanel>

        <WorkspacePanel title="ALM" health="not-configured" summary="Integration not configured">
          <p className="workspace-placeholder">ALM Release: {release.almReleaseId ?? 'Not configured'}</p>
          <p className="workspace-note">Future capabilities: Regression, CAT, Test Runs, and Pass Rate.</p>
        </WorkspacePanel>

        <WorkspacePanel
          title="RAID"
          health="not-configured"
          summary={`${release.raidCount} assigned`}
          actions={<button className="secondary-button" type="button" onClick={onOpenRaid}>Open Register</button>}
        >
          <p className="workspace-placeholder">Release-level RAID linkage is not configured.</p>
          <p className="workspace-note">Future workspace summaries: Risks, Issues, Dependencies, and Assumptions.</p>
        </WorkspacePanel>

        <WorkspacePanel
          title="Release Planning"
          health="healthy"
          summary={schedule ? 'Schedule available' : 'Not scheduled'}
          defaultExpanded
        >
          <ReleaseScheduleSection
            key={releaseId}
            releaseId={releaseId}
            schedule={schedule}
            isSeedSchedule={isSeedSchedule}
            onSave={onSaveSchedule}
          />
        </WorkspacePanel>

        <WorkspacePanel
          title="Phase Progress"
          health={attentionPhases.length ? 'attention' : 'healthy'}
          summary={attentionPhases.length ? `${attentionPhases.length} phases need attention` : 'No blocked phases'}
          defaultExpanded
        >
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
                      <small>{rollup.applicableProgressCount} applicable{rollup.blockedCount > 0 && ` · ${rollup.blockedCount} blocked`}{rollup.completeCount > 0 && ` · ${rollup.completeCount} complete`}</small>
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
                  <th>RAID ID</th><th>Priority</th><th>Title</th><th>Status</th><th>Customer / Project</th><th>Services</th><th>{selectedPhaseName ? 'Phase progress' : 'Progress'}</th><th className="open-column"><span className="sr-only">Open</span></th>
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
                        {feature.unknownServiceLabels.length > 0 && <span className="unmapped-inline">Unmapped: {feature.unknownServiceLabels.join(', ')}</span>}
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
        </WorkspacePanel>
      </div>
    </section>
  );
}
