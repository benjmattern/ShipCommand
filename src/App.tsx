import { useEffect, useMemo, useState } from 'react';
import { loadBacklogRecords } from './connectors';
import type { DataRecord } from './types';

type ModalState = { mode: 'view'; record: DataRecord } | { mode: 'create' } | null;

function App() {
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [selectedRelease, setSelectedRelease] = useState('all');
  const [modal, setModal] = useState<ModalState>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  const filteredRecords = useMemo(
    () => selectedRelease === 'all' ? records : records.filter((record) => record.release === selectedRelease),
    [records, selectedRelease],
  );
  const releases = useMemo(
    () => Array.from(new Set(records.map((record) => record.release).filter((release): release is string => Boolean(release)))),
    [records],
  );

  const metrics = useMemo(() => {
    return [
      { label: 'Total RAID items', value: filteredRecords.length.toString() },
      { label: 'Upcoming releases', value: releases.length.toString() },
      { label: 'Without release', value: records.filter((record) => !record.release).length.toString() },
    ];
  }, [filteredRecords, records, releases]);

  useEffect(() => {
    if (!modal) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setModal(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modal]);

  useEffect(() => {
    let cancelled = false;
    loadBacklogRecords()
      .then((workbookRecords) => {
        if (cancelled) return;
        setRecords(workbookRecords);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => { cancelled = true; };
  }, []);

  function reorderRecords(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setRecords((current) => {
      const next = [...current];
      const from = next.findIndex((record) => record.id === draggedId);
      const to = next.findIndex((record) => record.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((record, index) => ({ ...record, priority: index + 1 }));
    });
    setDraggedId(null);
  }

  function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const numericIds = records.map((record) => Number(record.raidId.replace(/\D/g, '')) || 100);
    const nextId = Math.max(100, ...numericIds) + 1;
    const newRecord: DataRecord = {
      id: `local-${crypto.randomUUID()}`,
      raidId: `RAID ID ${nextId}`,
      title: String(form.get('title')),
      priority: records.length + 1,
      release: String(form.get('release') || '') || undefined,
      source: 'excel',
      status: 'Draft',
      updatedAt: new Date().toISOString().slice(0, 10),
      summary: String(form.get('summary') || ''),
    };
    setRecords((current) => [...current, newRecord]);
    setSelectedRelease('all');
    setModal({ mode: 'view', record: newRecord });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">◇</span>ShipCommand</div>
        <nav aria-label="Primary navigation">
          <button className="nav-item active" type="button">▦ <span>RAID dashboard</span></button>
          <button className="nav-item" type="button">□ <span>Releases</span></button>
          <button className="nav-item" type="button">✓ <span>Approvals</span></button>
          <button className="nav-item" type="button">⚙ <span>Settings</span></button>
        </nav>
        <div className="local-badge"><span /> Local data only</div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Release documentation tracking</p>
            <h1>RAID dashboard</h1>
            <p>Review and manage release risks, actions, issues, and decisions.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => setModal({ mode: 'create' })}>
            <span>＋</span> New RAID item
          </button>
        </header>

        <section className="metric-grid" aria-label="RAID summary">
          {metrics.map((metric, index) => (
            <article className="metric-card" key={metric.label}>
              <span className={`metric-icon metric-icon-${index}`}>{index === 0 ? '▦' : index === 1 ? '!' : '◷'}</span>
              <div><p>{metric.label}</p><strong>{metric.value}</strong></div>
            </article>
          ))}
        </section>

        <section className="board">
          <div className="board-header">
            <div>
              <h2>RAID register</h2>
              <p>Loaded from BacklogData.xlsx. Drag rows to update priority; RAID IDs remain fixed.</p>
            </div>

            <div className="board-actions">
              <label className="sr-only" htmlFor="release-filter">Filter by release</label>
              <select
                id="release-filter"
                value={selectedRelease}
                onChange={(event) => setSelectedRelease(event.target.value)}
              >
                <option value="all">All releases</option>
                {releases.map((release) => <option key={release} value={release}>{release}</option>)}
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="drag-column"><span className="sr-only">Reorder</span></th>
                  <th>RAID ID</th>
                  <th>Priority</th>
                  <th>Title</th>
                  <th>Release</th>
                  <th className="open-column"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      draggable
                      className={draggedId === record.id ? 'dragging' : ''}
                      onDragStart={() => setDraggedId(record.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => reorderRecords(record.id)}
                      onClick={() => setModal({ mode: 'view', record })}
                    >
                      <td className="drag-handle" aria-hidden="true">⠿</td>
                      <td className="raid-id">{record.raidId}</td>
                      <td><span className="priority priority-number">{record.priority}</span></td>
                      <td className="record-title">{record.title}</td>
                      <td className="release-cell">{record.release || '—'}</td>
                      <td className="row-arrow">›</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {loadState === 'loading' && <p className="empty-state">Loading RAID items from BacklogData.xlsx…</p>}
            {loadState === 'error' && <p className="empty-state error-state">BacklogData.xlsx could not be loaded.</p>}
            {loadState === 'ready' && filteredRecords.length === 0 && <p className="empty-state">No RAID items match this release.</p>}
          </div>
        </section>
      </main>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setModal(null)}>×</button>
            {modal.mode === 'view' ? (
              <>
                <div className="modal-heading">
                  <p>{modal.record.raidId}</p>
                  <h2 id="modal-title">{modal.record.title}</h2>
                  <span className="priority priority-number">Priority {modal.record.priority}</span>
                </div>
                <dl className="detail-grid">
                  <div><dt>Status</dt><dd>{modal.record.status}</dd></div>
                  <div><dt>Release</dt><dd>{modal.record.release || 'Not assigned'}</dd></div>
                  <div><dt>Submitted</dt><dd>{modal.record.updatedAt || 'Not recorded'}</dd></div>
                  <div><dt>Customer / Project</dt><dd>{modal.record.customer || 'Not recorded'}</dd></div>
                  <div><dt>Services</dt><dd>{modal.record.services || 'Not recorded'}</dd></div>
                  <div><dt>Data source</dt><dd>BacklogData.xlsx</dd></div>
                </dl>
                <div className="description">
                  <h3>Description</h3>
                  <p>{modal.record.summary || 'No additional details have been added.'}</p>
                </div>
                <div className="modal-footer"><button className="secondary-button" type="button" onClick={() => setModal(null)}>Close</button></div>
              </>
            ) : (
              <form onSubmit={createRecord}>
                <div className="modal-heading">
                  <p>RAID register</p>
                  <h2 id="modal-title">Create a new RAID item</h2>
                </div>
                <div className="form-grid">
                  <label className="full-field">Title<input name="title" required autoFocus placeholder="Enter a concise title" /></label>
                  <label>Priority<input value={records.length + 1} disabled aria-label="Assigned priority" /></label>
                  <label>Release (optional)<select name="release" defaultValue=""><option value="">Not assigned</option>{releases.map((release) => <option key={release} value={release}>{release}</option>)}</select></label>
                  <label className="full-field">Description<textarea name="summary" rows={4} placeholder="Add context, impact, or next steps" /></label>
                </div>
                <div className="modal-footer">
                  <button className="secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button>
                  <button className="primary-button" type="submit">Create RAID item</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
