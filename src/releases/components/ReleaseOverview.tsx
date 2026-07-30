interface ReleaseOverviewProps {
  featureCount: number;
  progressPercent: number | null;
}

export function ReleaseOverview({ featureCount, progressPercent }: ReleaseOverviewProps) {
  return (
    <dl className="release-overview-grid">
      <div><dt>Overall Status</dt><dd>Not recorded</dd></div>
      <div><dt>Owner</dt><dd>Not recorded</dd></div>
      <div><dt>Promotion Date</dt><dd>Not recorded</dd></div>
      <div><dt>Environment</dt><dd>Not recorded</dd></div>
      <div><dt>RAID features</dt><dd>{featureCount}</dd></div>
      <div><dt>Progress</dt><dd>{progressPercent === null ? 'N/A' : `${progressPercent}%`}</dd></div>
      <div className="release-overview-notes"><dt>Notes</dt><dd>No release notes have been recorded.</dd></div>
    </dl>
  );
}
