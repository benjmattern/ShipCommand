import { useMemo, useState } from 'react';
import { formatRaidId } from './raid';
import { selectReleaseFeatures, selectReleaseSummaries } from './releaseSelectors';
import type { DataRecord } from './types';

interface ReleaseTrackerProps {
  records: DataRecord[];
  loadState: 'loading' | 'ready' | 'error';
  onOpenRecord: (record: DataRecord) => void;
}

export function ReleaseTracker({ records, loadState, onOpenRecord }: ReleaseTrackerProps) {
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);
  const summaries = useMemo(() => selectReleaseSummaries(records), [records]);
  const features = useMemo(
    () => selectedRelease
      ? selectReleaseFeatures(records).filter((feature) => feature.release === selectedRelease)
      : [],
    [records, selectedRelease],
  );
  const unassignedCount = records.filter((record) => !record.release?.trim()).length;

  if (selectedRelease) {
    return (
      <section className="board release-detail">
        <div className="board-header">
          <div>
            <button className="text-button" type="button" onClick={() => setSelectedRelease(null)}>← All releases</button>
            <h2>{selectedRelease}</h2>
            <p>{features.length} assigned {features.length === 1 ? 'feature' : 'features'} from the current RAID register.</p>
          </div>
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
                <th>Progress</th>
                <th className="open-column"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => {
                const record = records.find((item) => item.id === feature.raidItemId);
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
                    <td className="progress-cell">{feature.progressPercent === null ? 'N/A' : `${feature.progressPercent}%`}</td>
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
        <section className="release-grid" aria-label="Releases">
          {summaries.map((release) => (
            <button className="release-card" type="button" key={release.name} onClick={() => setSelectedRelease(release.name)}>
              <div className="release-card-heading"><span>Release</span><strong>{release.name}</strong></div>
              <div className="release-counts">
                <span><strong>{release.featureCount}</strong> Features</span>
                <span><strong>{release.completedCount}</strong> Complete</span>
                <span><strong>{release.remainingCount}</strong> Remaining</span>
              </div>
              <div className="release-progress">
                <span>Derived progress</span>
                <strong>{release.progressPercent === null ? 'N/A' : `${release.progressPercent}%`}</strong>
              </div>
              <span className="release-open">View release <b>→</b></span>
            </button>
          ))}
        </section>
      )}
    </>
  );
}
