import { useMemo, useRef, useState } from 'react';
import { loadVersionOneStories, versionOneInspectionRelease } from './versionOneApi';
import { filterVersionOneStories, naturalRecordNumberCompare, storyFilterOptions } from './versionOneFilters';
import type { VersionOneRecordType, VersionOneStoriesResponse } from './versionOneTypes';

export function VersionOneStoriesPage() {
  const [result, setResult] = useState<VersionOneStoriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [recordType, setRecordType] = useState<'' | VersionOneRecordType>('');
  const [status, setStatus] = useState('');
  const [team, setTeam] = useState('');
  const loadingRef = useRef(false);

  async function loadStories() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      setResult(await loadVersionOneStories());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'VersionOne records could not be retrieved.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  const statuses = useMemo(() => storyFilterOptions(result?.stories ?? [], 'status'), [result]);
  const teams = useMemo(() => storyFilterOptions(result?.stories ?? [], 'teamName'), [result]);
  const displayedStories = useMemo(
    () => filterVersionOneStories(result?.stories ?? [], search, recordType, status, team)
      .sort(naturalRecordNumberCompare),
    [result, search, recordType, status, team],
  );
  const hasOtherRecords = Boolean(result?.otherCount);

  return (
    <section className="versionone-page">
      <div className="versionone-toolbar">
        <div>
          <p className="eyebrow">Read-only enterprise data</p>
          <h2>Release {versionOneInspectionRelease}</h2>
          <p>Stories and defects are retrieved through the ShipCommand Local Integration API.</p>
        </div>
        <button className="primary-button" type="button" onClick={loadStories} disabled={loading}>
          {loading ? 'Loading…' : result ? 'Refresh records' : 'Load records'}
        </button>
      </div>

      {error && (
        <div className="versionone-error" role="alert">
          <strong>VersionOne records could not be loaded.</strong>
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={loadStories} disabled={loading}>Retry</button>
        </div>
      )}

      {!result && !error && !loading && <p className="empty-state standalone">VersionOne records have not been loaded.</p>}
      {!result && loading && <p className="empty-state standalone" aria-live="polite">Loading VersionOne records…</p>}

      {result && (
        <>
          <section className="versionone-summary" aria-label="VersionOne retrieval summary">
            <div><strong>{result.recordCount}</strong><span>Total</span></div>
            <div><strong>{result.storyCount}</strong><span>Stories</span></div>
            <div><strong>{result.defectCount}</strong><span>Defects</span></div>
            {result.otherCount > 0 && <div><strong>{result.otherCount}</strong><span>Other</span></div>}
            <div><strong>{result.pageCount}</strong><span>Pages</span></div>
            <div><strong>{result.durationMs} ms</strong><span>Retrieval time</span></div>
            <div><strong>{new Date(result.retrievedAt).toLocaleString()}</strong><span>Retrieved</span></div>
          </section>

          <div className="versionone-filters">
            <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Number or title" /></label>
            <label>Type<select value={recordType} onChange={(event) => setRecordType(event.target.value as '' | VersionOneRecordType)}><option value="">All Types</option><option value="story">Stories</option><option value="defect">Defects</option>{hasOtherRecords && <option value="other">Other</option>}</select></label>
            <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Team<select value={team} onChange={(event) => setTeam(event.target.value)}><option value="">All teams</option>{teams.map((value) => <option key={value}>{value}</option>)}</select></label>
            <span>{displayedStories.length} shown</span>
          </div>

          <section className="board">
            <div className="table-wrap">
              <table className="versionone-table">
                <thead><tr><th>Number</th><th>Type</th><th>Title</th><th>Status</th><th>Team</th><th>Owners</th><th>Asset State</th></tr></thead>
                <tbody>
                  {displayedStories.map((story) => (
                    <tr key={story.id}>
                      <td className="raid-id">{story.number || '—'}</td>
                      <td><span className={`record-type-badge ${story.recordType}`}>{story.recordType === 'story' ? 'Story' : story.recordType === 'defect' ? 'Defect' : 'Other'}</span></td>
                      <td className="record-title">{story.name || '—'}<small>{story.oid || story.id}</small></td>
                      <td>{story.status || '—'}</td>
                      <td>{story.teamName || '—'}</td>
                      <td>{story.ownerNames.length ? story.ownerNames.join(', ') : '—'}</td>
                      <td>{story.assetState || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayedStories.length === 0 && <p className="empty-state">No VersionOne records match the current filters.</p>}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
