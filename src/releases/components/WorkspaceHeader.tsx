import type { Release } from '../releaseTypes';

interface WorkspaceHeaderProps {
  release: Release;
  progressPercent: number | null;
  onBack: () => void;
}

export function WorkspaceHeader({ release, progressPercent, onBack }: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="workspace-header-title">
        <button className="text-button" type="button" onClick={onBack}>← All releases</button>
        <h2>{release.name}</h2>
        <span className="workspace-overall-status">{release.status ?? 'Status not set'}</span>
      </div>
      <dl className="workspace-header-metrics">
        <div><dt>Progress</dt><dd>{progressPercent === null ? 'N/A' : `${progressPercent}%`}</dd></div>
        <div><dt>Stories</dt><dd>{release.storyCount ?? '—'}</dd></div>
        <div><dt>Defects</dt><dd>{release.defectCount ?? '—'}</dd></div>
        <div><dt>TSLC</dt><dd>{release.tslcProjectId ?? '—'}</dd></div>
        <div><dt>ALM</dt><dd>{release.almReleaseId ?? '—'}</dd></div>
        <div><dt>RAID</dt><dd>{release.raidCount}</dd></div>
        <div><dt>Last refresh</dt><dd>{release.lastRefresh ?? 'Not recorded'}</dd></div>
      </dl>
    </header>
  );
}
