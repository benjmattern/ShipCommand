import type { Release } from '../releaseTypes';

interface ReleaseOverviewProps {
  release: Release;
  progressPercent: number | null;
}

export function ReleaseOverview({ release, progressPercent }: ReleaseOverviewProps) {
  return (
    <dl className="release-overview-grid">
      <div><dt>Release</dt><dd>{release.name}</dd></div>
      <div><dt>Overall Status</dt><dd>{release.status ?? 'Not recorded'}</dd></div>
      <div><dt>Owner</dt><dd>{release.owner ?? 'Not recorded'}</dd></div>
      <div><dt>Promotion Date</dt><dd>{release.promotionDate ?? 'Not recorded'}</dd></div>
      <div><dt>Environment</dt><dd>{release.environment ?? 'Not recorded'}</dd></div>
      <div><dt>RAID features</dt><dd>{release.raidCount}</dd></div>
      <div><dt>Progress</dt><dd>{progressPercent === null ? 'N/A' : `${progressPercent}%`}</dd></div>
      <div className="release-overview-notes"><dt>Notes</dt><dd>{release.notes ?? 'No release notes have been recorded.'}</dd></div>
    </dl>
  );
}
