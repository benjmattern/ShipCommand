import { useMemo, useState } from 'react';
import { getConnectorLabels, getRecordsForSource } from './connectors';
import type { SourceKey } from './types';

function App() {
  const [selectedSource, setSelectedSource] = useState<SourceKey | 'all'>('all');

  const filteredRecords = useMemo(() => getRecordsForSource(selectedSource), [selectedSource]);
  const connectorLabels = useMemo(() => getConnectorLabels(), []);

  const metrics = useMemo(() => {
    const activeSources = new Set(filteredRecords.map((record) => record.source)).size;
    const pending = filteredRecords.filter((record) => record.status.toLowerCase() === 'draft').length;

    return [
      { label: 'Signals', value: filteredRecords.length.toString(), detail: 'records in view' },
      { label: 'Sources', value: activeSources.toString(), detail: 'active connectors' },
      { label: 'Drafts', value: pending.toString(), detail: 'awaiting review' },
    ];
  }, [filteredRecords]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_32%),linear-gradient(135deg,_#020617_0%,_#071324_45%,_#030712_100%)] p-4 text-slate-100 sm:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 p-6 shadow-[0_0_80px_rgba(6,182,212,0.12)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">ShipCommand / Local Ops</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Command deck</h1>
              <p className="max-w-2xl text-sm text-slate-400 sm:text-base">
                A local proof-of-concept cockpit for reviewing incoming data streams from Excel, SharePoint, and ServiceNow.
              </p>
            </div>
            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              Mission status: local sync active
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-400">{metric.detail}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="rounded-[2rem] border border-slate-800/80 bg-slate-900/70 p-5 shadow-[0_0_70px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-cyan-400/10 bg-slate-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Mission board</p>
              <p className="text-sm text-slate-400">Filter and inspect the most recent data snapshots.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-300" htmlFor="source-filter">
                Filter by source
              </label>
              <select
                id="source-filter"
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-400"
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

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/80">
                {filteredRecords.map((record) => {
                  const tone =
                    record.status.toLowerCase() === 'draft'
                      ? 'bg-amber-500/10 text-amber-300'
                      : record.status.toLowerCase() === 'queued'
                        ? 'bg-cyan-500/10 text-cyan-300'
                        : 'bg-emerald-500/10 text-emerald-300';

                  return (
                    <tr key={record.id} className="transition hover:bg-slate-800/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{record.title}</div>
                        {record.summary ? <div className="mt-1 text-xs text-slate-400">{record.summary}</div> : null}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-300">{record.source}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{record.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{record.updatedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
