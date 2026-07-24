import { useEffect, useMemo, useState } from 'react';
import { getConnectorLabels, getInitialRecords } from './connectors';
import type { DataRecord, SourceKey } from './types';

type ModalState = { mode: 'view'; record: DataRecord } | { mode: 'create' } | null;

const priorityRank: Record<DataRecord['priority'], number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function App() {
  const [records, setRecords] = useState<DataRecord[]>(getInitialRecords);
  const [selectedSource, setSelectedSource] = useState<SourceKey | 'all'>('all');
  const [modal, setModal] = useState<ModalState>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);

  const filteredRecords = useMemo(() => {
    const filtered = selectedSource === 'all' ? records : records.filter((record) => record.source === selectedSource);
    return sortByPriority ? [...filtered].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]) : filtered;
  }, [records, selectedSource, sortByPriority]);
  const connectorLabels = useMemo(() => getConnectorLabels(), []);

  const metrics = useMemo(() => {
    return [
      { label: 'Total RAID items', value: filteredRecords.length.toString() },
      { label: 'Critical priority', value: filteredRecords.filter((record) => record.priority === 'Critical').length.toString() },
      { label: 'Awaiting review', value: filteredRecords.filter((record) => record.status === 'Draft').length.toString() },
    ];
  }, [filteredRecords]);

  useEffect(() => {
    if (!modal) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setModal(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modal]);

  function reorderRecords(targetId: string) {
    if (!draggedId || draggedId === targetId || sortByPriority) return;
    setRecords((current) => {
      const next = [...current];
      const from = next.findIndex((record) => record.id === draggedId);
      const to = next.findIndex((record) => record.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedId(null);
  }

  function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const numericIds = records.map((record) => Number(record.raidId.replace(/\D/g, '')) || 100);
    const nextId = Math.max(100, ...numericIds) + 1;
    const source = form.get('source') as SourceKey;
    const newRecord: DataRecord = {
      id: `local-${crypto.randomUUID()}`,
      raidId: `RAID ID${nextId}`,
      title: String(form.get('title')),
      priority: form.get('priority') as DataRecord['priority'],
      source,
      status: 'Draft',
      updatedAt: new Date().toISOString().slice(0, 10),
      summary: String(form.get('summary') || ''),
    };
    setRecords((current) => [...current, newRecord]);
    setSelectedSource('all');
    setSortByPriority(false);
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
              <p>Drag rows to reprioritize. Select a row to view its details.</p>
            </div>

            <div className="board-actions">
              <button className={`secondary-button ${sortByPriority ? 'selected' : ''}`} type="button" onClick={() => setSortByPriority((value) => !value)}>
                ↕ Priority
              </button>
              <label className="sr-only" htmlFor="source-filter">Filter by source</label>
              <select
                id="source-filter"
                value={selectedSource}
                onChange={(event) => setSelectedSource(event.target.value as SourceKey | 'all')}
              >
                <option value="all">All sources</option>
                {connectorLabels.map((connector) => (
                  <option key={connector.key} value={connector.key}>
                    {connector.label}
                  </option>
                ))}
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
                  <th className="open-column"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      draggable={!sortByPriority}
                      className={draggedId === record.id ? 'dragging' : ''}
                      onDragStart={() => setDraggedId(record.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => reorderRecords(record.id)}
                      onClick={() => setModal({ mode: 'view', record })}
                    >
                      <td className="drag-handle" aria-hidden="true">⠿</td>
                      <td className="raid-id">{record.raidId}</td>
                      <td><span className={`priority priority-${record.priority.toLowerCase()}`}>{record.priority}</span></td>
                      <td className="record-title">{record.title}</td>
                      <td className="row-arrow">›</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {filteredRecords.length === 0 && <p className="empty-state">No RAID items match this source.</p>}
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
                  <span className={`priority priority-${modal.record.priority.toLowerCase()}`}>{modal.record.priority} priority</span>
                </div>
                <dl className="detail-grid">
                  <div><dt>Status</dt><dd>{modal.record.status}</dd></div>
                  <div><dt>Source</dt><dd>{connectorLabels.find((item) => item.key === modal.record.source)?.label}</dd></div>
                  <div><dt>Last updated</dt><dd>{modal.record.updatedAt}</dd></div>
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
                  <label>Priority<select name="priority" defaultValue="Medium"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
                  <label>Source<select name="source" defaultValue="excel">{connectorLabels.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
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
