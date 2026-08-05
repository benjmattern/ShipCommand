import { useMemo, useRef, useState } from 'react';
import { loadVersionOneRequests } from './versionOneRequestApi';
import {
  filterVersionOneRequests,
  matchesRequestView,
  requestFilterOptions,
  sortVersionOneRequests,
} from './versionOneRequestFilters';
import type {
  SortDirection,
  VersionOneRequest,
  VersionOneRequestSortField,
  VersionOneRequestView,
  VersionOneRequestsResponse,
} from './versionOneRequestTypes';

const columns: Array<{ field: VersionOneRequestSortField; label: string }> = [
  { field: 'number', label: 'Number' },
  { field: 'name', label: 'Request' },
  { field: 'planningLevelName', label: 'Planning Level' },
  { field: 'priority', label: 'Priority' },
  { field: 'status', label: 'Status' },
  { field: 'ownerName', label: 'Owner' },
  { field: 'assetState', label: 'Asset State' },
];

function display(value: string | null) {
  return value ?? '—';
}

export function VersionOneRequestsPage() {
  const [result, setResult] = useState<VersionOneRequestsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [owner, setOwner] = useState('');
  const [planningLevelName, setPlanningLevelName] = useState('');
  const [assetState, setAssetState] = useState('');
  const [view, setView] = useState<VersionOneRequestView>('active-intake');
  const [sortField, setSortField] = useState<VersionOneRequestSortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');
  const [selected, setSelected] = useState<VersionOneRequest | null>(null);
  const loadingRef = useRef(false);

  async function refresh() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      setResult(await loadVersionOneRequests());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'VersionOne requests could not be retrieved.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  function changeSort(field: VersionOneRequestSortField) {
    if (field === sortField) {
      setSortDirection((current) => current === 'ascending' ? 'descending' : 'ascending');
    } else {
      setSortField(field);
      setSortDirection('ascending');
    }
  }

  const requests = result?.requests ?? [];
  const statuses = useMemo(() => requestFilterOptions(requests, 'status'), [requests]);
  const priorities = useMemo(() => requestFilterOptions(requests, 'priority'), [requests]);
  const owners = useMemo(() => requestFilterOptions(requests, 'ownerName'), [requests]);
  const planningLevels = useMemo(() => requestFilterOptions(requests, 'planningLevelName'), [requests]);
  const assetStates = useMemo(() => requestFilterOptions(requests, 'assetState'), [requests]);
  const viewCounts = useMemo(() => ({
    activeIntake: requests.filter((request) => matchesRequestView(request, 'active-intake')).length,
    allActive: requests.filter((request) => matchesRequestView(request, 'all-active')).length,
    releaseAssigned: requests.filter((request) => matchesRequestView(request, 'release-assigned')).length,
    all: requests.length,
  }), [requests]);
  const displayedRequests = useMemo(() => sortVersionOneRequests(
    filterVersionOneRequests(requests, search, status, priority, owner, planningLevelName, assetState, view),
    sortField,
    sortDirection,
  ), [requests, search, status, priority, owner, planningLevelName, assetState, view, sortField, sortDirection]);
  const hasFieldFilters = Boolean(search.trim() || status || priority || owner || planningLevelName || assetState);
  const emptyMessage = hasFieldFilters
    ? 'No Requests match current filters.'
    : view === 'active-intake'
      ? 'No active intake Requests found.'
      : view === 'release-assigned'
        ? 'No release-assigned Requests found.'
        : 'No Requests match current filters.';

  return (
    <section className="versionone-page">
      <div className="versionone-toolbar request-toolbar">
        <div>
          <p className="eyebrow">Read-only enterprise data</p>
          <h2>VersionOne Requests</h2>
          <p>Requests are retrieved independently through the ShipCommand Local Integration API.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Loading…' : result ? 'Refresh' : 'Load Requests'}
        </button>
      </div>

      {error && <div className="versionone-error" role="alert"><strong>VersionOne Requests could not be retrieved.</strong><p>{error}</p><button className="secondary-button" type="button" onClick={() => void refresh()} disabled={loading}>Retry</button></div>}
      {loading && !result && <p className="empty-state standalone" aria-live="polite">Loading VersionOne Requests…</p>}

      {result && <>
        <section className="versionone-summary" aria-label="Request retrieval summary">
          <div><strong>{result.recordCount}</strong><span>Requests</span></div>
          <div><strong>{result.pageCount}</strong><span>Pages</span></div>
          <div><strong>{new Date(result.retrievedAt).toLocaleString()}</strong><span>Retrieved</span></div>
          <div><strong>{result.durationMs} ms</strong><span>Duration</span></div>
        </section>

        {result.recordCount === 0 ? <p className="empty-state standalone">No VersionOne Requests were found.</p> : <>
          <div className="versionone-filters request-filters">
            <label>View<select value={view} onChange={(event) => setView(event.target.value as VersionOneRequestView)}><option value="active-intake">Active Intake ({viewCounts.activeIntake})</option><option value="all-active">All Active Requests ({viewCounts.allActive})</option><option value="release-assigned">Release Assigned Requests ({viewCounts.releaseAssigned})</option><option value="all">All Accessible Requests ({viewCounts.all})</option></select></label>
            <label>Search<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Number or Request name" /></label>
            <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">All Priorities</option>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Owner<select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">All Owners</option>{owners.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Planning Level<select value={planningLevelName} onChange={(event) => setPlanningLevelName(event.target.value)}><option value="">All Planning Levels</option>{planningLevels.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Asset State<select value={assetState} onChange={(event) => setAssetState(event.target.value)}><option value="">All Asset States</option>{assetStates.map((value) => <option key={value}>{value}</option>)}</select></label>
            <span>Showing {displayedRequests.length} of {result.recordCount} Requests</span>
          </div>
          <div className="table-wrap">
            <table className="versionone-table request-table">
              <thead><tr>{columns.map((column) => <th key={column.field}><button className="table-sort" type="button" onClick={() => changeSort(column.field)} aria-sort={sortField === column.field ? sortDirection : undefined}>{column.label}{sortField === column.field ? (sortDirection === 'ascending' ? ' ↑' : ' ↓') : ''}</button></th>)}</tr></thead>
              <tbody>{displayedRequests.map((request) => <tr key={request.id} onClick={() => setSelected(request)} tabIndex={0} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && setSelected(request)}><td className="raid-id">{display(request.number)}</td><td className="record-title">{display(request.name)}</td><td>{display(request.planningLevelName)}</td><td>{display(request.priority)}</td><td>{display(request.status)}</td><td>{display(request.ownerName)}</td><td>{display(request.assetState)}</td></tr>)}</tbody>
            </table>
            {displayedRequests.length === 0 && <p className="empty-state">{emptyMessage}</p>}
          </div>
        </>}
      </>}

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="modal request-details" role="dialog" aria-modal="true" aria-labelledby="request-detail-title"><button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setSelected(null)}>×</button><div className="modal-heading"><p>{display(selected.number)}</p><h2 id="request-detail-title">{display(selected.name)}</h2></div><dl className="detail-grid"><div><dt>Planning Level</dt><dd>{display(selected.planningLevelName)}</dd></div><div><dt>Priority</dt><dd>{display(selected.priority)}</dd></div><div><dt>Status</dt><dd>{display(selected.status)}</dd></div><div><dt>Owner</dt><dd>{display(selected.ownerName)}</dd></div><div><dt>Asset State</dt><dd>{display(selected.assetState)}</dd></div><div><dt>OID</dt><dd>{display(selected.oid)}</dd></div><div><dt>href</dt><dd>{display(selected.href)}</dd></div></dl><p className="workspace-note">Read-only VersionOne data. ShipCommand does not edit or persist this Request.</p></section></div>}
    </section>
  );
}
