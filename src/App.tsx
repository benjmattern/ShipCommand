import { useMemo, useState } from 'react';
import { getConnectorLabels, getRecordsForSource } from './connectors';
import type { SourceKey } from './types';

function App() {
  const [selectedSource, setSelectedSource] = useState<SourceKey | 'all'>('all');

  const filteredRecords = useMemo(() => getRecordsForSource(selectedSource), [selectedSource]);
  const connectorLabels = useMemo(() => getConnectorLabels(), []);

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-400">ShipCommand</p>
          <h1 className="text-3xl font-semibold">Unified data ingest preview</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            A local proof-of-concept shell for combining Excel, SharePoint, and ServiceNow data into one view.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-300" htmlFor="source-filter">
              Filter by source
            </label>
            <select
              id="source-filter"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
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

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/60">
                    <td className="px-4 py-3">
                      <div className="font-medium">{record.title}</div>
                      {record.summary ? <div className="mt-1 text-xs text-slate-400">{record.summary}</div> : null}
                    </td>
                    <td className="px-4 py-3 capitalize">{record.source}</td>
                    <td className="px-4 py-3">{record.status}</td>
                    <td className="px-4 py-3">{record.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
