import { useEffect, useMemo, useState } from 'react';
import { loadBacklogRecords } from './connectors';
import { formatRaidId } from './raid';
import { ReleaseTracker } from './ReleaseTracker';
import { getMicroserviceNames, microservices } from './microservices';
import type { DataRecord } from './types';

type ModalState =
  | { mode: 'view'; record: DataRecord }
  | { mode: 'edit'; record: DataRecord }
  | { mode: 'create' }
  | null;

const statusOptions = ['Unassigned', 'Draft', 'Solutioning', 'Financial Review', 'REQ Approved', 'In Progress', 'Blocked', 'Complete'];

function normalizePriorities(items: DataRecord[]) {
  return items.map((record, index) => ({ ...record, priority: index + 1 }));
}

function insertAtPriority(items: DataRecord[], record: DataRecord, requestedPriority: number) {
  const withoutRecord = items.filter((item) => item.id !== record.id);
  const targetIndex = Math.max(0, Math.min(withoutRecord.length, requestedPriority - 1));
  withoutRecord.splice(targetIndex, 0, record);
  return normalizePriorities(withoutRecord);
}

function App() {
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [activeView, setActiveView] = useState<'raid' | 'releases'>('raid');
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
      return normalizePriorities(next);
    });
    setDraggedId(null);
  }

  function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const requestedPriority = Number(form.get('priority')) || records.length + 1;
    const existingRecord = modal?.mode === 'edit' ? modal.record : undefined;
    const numericIds = records
      .map((record) => Number(record.raidId.replace(/\D/g, '')))
      .filter((id) => Number.isFinite(id));
    const nextId = Math.max(0, ...numericIds) + 1;
    const savedRecord: DataRecord = {
      id: existingRecord?.id || `local-${crypto.randomUUID()}`,
      raidId: existingRecord?.raidId || formatRaidId(nextId),
      title: String(form.get('title')),
      priority: requestedPriority,
      release: String(form.get('release') || '') || undefined,
      source: existingRecord?.source || 'excel',
      status: String(form.get('status') || 'Draft'),
      customer: String(form.get('customer') || '') || undefined,
      impactedMicroserviceIds: form.getAll('microserviceIds').map(String),
      unknownServiceLabels: existingRecord?.unknownServiceLabels,
      updatedAt: existingRecord?.updatedAt || new Date().toISOString().slice(0, 10),
      summary: String(form.get('summary') || ''),
    };
    setRecords((current) => insertAtPriority(current, savedRecord, requestedPriority));
    setSelectedRelease('all');
    setModal({ mode: 'view', record: savedRecord });
  }

  function deleteRecord(record: DataRecord) {
    if (!window.confirm(`Delete ${formatRaidId(record.raidId)}? This only affects the current local session.`)) return;
    setRecords((current) => normalizePriorities(current.filter((item) => item.id !== record.id)));
    setModal(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">◇</span>ShipCommand</div>
        <nav aria-label="Primary navigation">
          <button className={`nav-item ${activeView === 'raid' ? 'active' : ''}`} type="button" onClick={() => setActiveView('raid')}>▦ <span>RAID dashboard</span></button>
          <button className={`nav-item ${activeView === 'releases' ? 'active' : ''}`} type="button" onClick={() => setActiveView('releases')}>□ <span>Releases</span></button>
          <button className="nav-item" type="button" disabled>✓ <span>Approvals</span></button>
          <button className="nav-item" type="button" disabled>⚙ <span>Settings</span></button>
        </nav>
        <div className="local-badge"><span /> Local data only</div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Release documentation tracking</p>
            <h1>{activeView === 'raid' ? 'RAID dashboard' : 'Release tracker'}</h1>
            <p>{activeView === 'raid'
              ? 'Review and manage release risks, actions, issues, and decisions.'
              : 'Explore release features derived directly from the current RAID register.'}</p>
          </div>
          {activeView === 'raid' && <button className="primary-button" type="button" onClick={() => setModal({ mode: 'create' })}>
            <span>＋</span> New RAID item
          </button>}
        </header>

        {activeView === 'raid' ? <>
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
                  <th>Status</th>
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
                      <td className="raid-id">{formatRaidId(record.raidId)}</td>
                      <td><span className="priority priority-number">{record.priority}</span></td>
                      <td className="record-title">{record.title}</td>
                      <td className="release-cell">{record.release || '—'}</td>
                      <td><span className="status-pill">{record.status}</span></td>
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
        </> : (
          <ReleaseTracker records={records} loadState={loadState} onOpenRecord={(record) => setModal({ mode: 'view', record })} />
        )}
      </main>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" type="button" aria-label="Close dialog" onClick={() => setModal(null)}>×</button>
            {modal.mode === 'view' ? (
              <>
                <div className="modal-heading">
                  <p>{formatRaidId(modal.record.raidId)}</p>
                  <h2 id="modal-title">{modal.record.title}</h2>
                </div>
                <dl className="detail-grid">
                  <div><dt>Submitted</dt><dd>{modal.record.updatedAt || 'Not recorded'}</dd></div>
                  <div><dt>Customer / Project</dt><dd>{modal.record.customer || 'Not recorded'}</dd></div>
                  <div><dt>Data source</dt><dd>BacklogData.xlsx</dd></div>
                </dl>
                <div className="service-detail">
                  <h3>Impacted microservices</h3>
                  {modal.record.impactedMicroserviceIds.length ? (
                    <div className="service-badges">
                      {getMicroserviceNames(modal.record.impactedMicroserviceIds).map((name) => <span key={name}>{name}</span>)}
                    </div>
                  ) : <p>No impacted microservices identified.</p>}
                  {modal.record.unknownServiceLabels?.length ? (
                    <div className="unmapped-services">
                      <strong>Unmapped workbook values</strong>
                      <p>{modal.record.unknownServiceLabels.join(', ')}</p>
                    </div>
                  ) : null}
                </div>
                <div className="description">
                  <h3>Description</h3>
                  <p>{modal.record.summary || 'No additional details have been added.'}</p>
                </div>
                <div className="modal-footer modal-footer-split">
                  <button className="danger-button" type="button" onClick={() => deleteRecord(modal.record)}>Delete</button>
                  <div>
                    <button className="secondary-button" type="button" onClick={() => setModal(null)}>Close</button>
                    <button className="primary-button" type="button" onClick={() => setModal({ mode: 'edit', record: modal.record })}>Edit item</button>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={saveRecord}>
                <div className="modal-heading">
                  <p>RAID register</p>
                  <h2 id="modal-title">{modal.mode === 'edit' ? `Edit ${formatRaidId(modal.record.raidId)}` : 'Create a new RAID item'}</h2>
                </div>
                <div className="form-grid">
                  <label className="full-field">Title<input name="title" required autoFocus defaultValue={modal.mode === 'edit' ? modal.record.title : ''} placeholder="Enter a concise title" /></label>
                  <label>Priority<input name="priority" type="number" min="1" max={records.length + (modal.mode === 'create' ? 1 : 0)} required defaultValue={modal.mode === 'edit' ? modal.record.priority : records.length + 1} /></label>
                  <label>Release (optional)<select name="release" defaultValue={modal.mode === 'edit' ? modal.record.release || '' : ''}><option value="">Not assigned</option>{releases.map((release) => <option key={release} value={release}>{release}</option>)}</select></label>
                  <label>Status<select name="status" defaultValue={modal.mode === 'edit' ? modal.record.status : 'Draft'}>{Array.from(new Set([...statusOptions, ...(modal.mode === 'edit' ? [modal.record.status] : [])])).map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label>Customer / Project<input name="customer" defaultValue={modal.mode === 'edit' ? modal.record.customer : ''} placeholder="Optional" /></label>
                  <fieldset className="full-field service-fieldset">
                    <legend>Impacted microservices</legend>
                    <p>Select any services affected by this RAID item.</p>
                    <div className="service-options">
                      {microservices.map((service) => (
                        <label key={service.id}>
                          <input
                            type="checkbox"
                            name="microserviceIds"
                            value={service.id}
                            defaultChecked={modal.mode === 'edit' && modal.record.impactedMicroserviceIds.includes(service.id)}
                          />
                          <span>{service.name}</span>
                        </label>
                      ))}
                    </div>
                    {modal.mode === 'edit' && modal.record.unknownServiceLabels?.length ? (
                      <div className="unmapped-services form-unmapped">
                        <strong>Preserved unmapped workbook values</strong>
                        <p>{modal.record.unknownServiceLabels.join(', ')}</p>
                      </div>
                    ) : null}
                  </fieldset>
                  <label className="full-field">Description<textarea name="summary" rows={4} defaultValue={modal.mode === 'edit' ? modal.record.summary : ''} placeholder="Add context, impact, or next steps" /></label>
                </div>
                <div className="modal-footer">
                  <button className="secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button>
                  <button className="primary-button" type="submit">{modal.mode === 'edit' ? 'Save changes' : 'Create RAID item'}</button>
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
