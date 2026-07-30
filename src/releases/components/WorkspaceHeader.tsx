interface WorkspaceHeaderProps {
  releaseId: string;
  raidCount: number;
  progressPercent: number | null;
  onBack: () => void;
}

export function WorkspaceHeader({
  releaseId,
  raidCount,
  progressPercent,
  onBack,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="workspace-header-title">
        <button className="text-button" type="button" onClick={onBack}>← All releases</button>
        <h2>{releaseId}</h2>
        <span className="workspace-overall-status">Status not set</span>
      </div>
      <dl className="workspace-header-metrics">
        <div><dt>Progress</dt><dd>{progressPercent === null ? 'N/A' : `${progressPercent}%`}</dd></div>
        <div><dt>Stories</dt><dd>—</dd></div>
        <div><dt>Defects</dt><dd>—</dd></div>
        <div><dt>TSLC</dt><dd>—</dd></div>
        <div><dt>ALM</dt><dd>—</dd></div>
        <div><dt>RAID</dt><dd>{raidCount}</dd></div>
        <div><dt>Last refresh</dt><dd>Not recorded</dd></div>
      </dl>
    </header>
  );
}
