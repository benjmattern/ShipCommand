import { useMemo, useRef, useState } from 'react';
import quickRomTemplateUrl from '../data/QuickROMTemplate.xlsx?url';
import { loadVersionOneRequests } from '../versionone/versionOneRequestApi';
import type { VersionOneRequest } from '../versionone/versionOneRequestTypes';
import { applicationConfig } from '../config';
import { downloadRomWorkbook } from './romExcel';
import { readRomSubmissions, writeRomSubmissions } from './romStore';
import {
  calculateRomTotals,
  romLineItems,
  romVendors,
  type RomSubmission,
  type RomVendor,
} from './romTypes';

function initialSubmissions() {
  try {
    return readRomSubmissions(window.sessionStorage);
  } catch {
    return [];
  }
}

function persistSubmissions(submissions: RomSubmission[]) {
  try {
    writeRomSubmissions(window.sessionStorage, submissions);
  } catch {
    // In-memory submissions remain available if sessionStorage is blocked.
  }
}

function requestLabel(request: VersionOneRequest) {
  const number = request.number ?? 'No number';
  const name = request.name ?? 'Untitled Request';
  return `${number} — ${name}`;
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function shortDate(value: string) {
  return new Date(value).toLocaleString();
}

export function RomPage() {
  const [vendor, setVendor] = useState<RomVendor>('LMI');
  const [taskOrder, setTaskOrder] = useState('');
  const [clin, setClin] = useState('');
  const [eBuyNumber, setEBuyNumber] = useState('');
  const [financeNumber, setFinanceNumber] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [project, setProject] = useState('');
  const [hours, setHours] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<RomSubmission[]>(initialSubmissions);
  const [requests, setRequests] = useState<VersionOneRequest[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const requestLoadingRef = useRef(false);

  const numericRate = hourlyRate.trim() === '' ? null : Number(hourlyRate);
  const hoursByCode = useMemo(() => Object.fromEntries(
    romLineItems.map((item) => [item.code, Math.max(0, Number(hours[item.code]) || 0)]),
  ), [hours]);
  const totals = useMemo(() => calculateRomTotals(hoursByCode, numericRate), [hoursByCode, numericRate]);
  const requestOptions = useMemo(() => requests.map((request) => ({
    request,
    label: requestLabel(request),
  })), [requests]);

  async function loadRequests() {
    if (!applicationConfig.versionOneEnabled || requestLoadingRef.current) return;
    requestLoadingRef.current = true;
    setRequestLoading(true);
    setRequestError(null);
    try {
      const response = await loadVersionOneRequests();
      setRequests(response.requests);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'VersionOne Requests could not be retrieved.');
    } finally {
      requestLoadingRef.current = false;
      setRequestLoading(false);
    }
  }

  function buildSubmission(): RomSubmission {
    const selectedRequest = requestOptions.find((option) => option.label === project)?.request;
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      vendor,
      taskOrder: taskOrder.trim() || undefined,
      clin: clin.trim() || undefined,
      eBuyNumber: eBuyNumber.trim() || undefined,
      financeNumber: financeNumber.trim() || undefined,
      hourlyRate: numericRate !== null && Number.isFinite(numericRate) ? numericRate : null,
      project: project.trim(),
      projectRequestId: selectedRequest?.id,
      projectRequestNumber: selectedRequest?.number ?? undefined,
      hoursByCode,
      ...totals,
    };
  }

  function saveSubmission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submission = buildSubmission();
    const next = [submission, ...submissions];
    setSubmissions(next);
    persistSubmissions(next);
    setMessage('ROM saved to the temporary submissions table.');
    setDownloadError(null);
  }

  async function downloadSubmission(submission: RomSubmission) {
    setDownloadError(null);
    try {
      await downloadRomWorkbook(quickRomTemplateUrl, submission);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'The ROM workbook could not be downloaded.');
    }
  }

  function deleteSubmission(id: string) {
    const next = submissions.filter((submission) => submission.id !== id);
    setSubmissions(next);
    persistSubmissions(next);
  }

  return (
    <section className="rom-page">
      <form className="rom-form" onSubmit={saveSubmission}>
        <div className="rom-card-heading">
          <div>
            <p className="eyebrow">Quick ROM</p>
            <h2>ROM inputs</h2>
            <p>Estimate labor hours and cost using the supplied Quick ROM categories.</p>
          </div>
          <div className="rom-total-callout"><span>Estimated ROM</span><strong>{currency(totals.totalCost)}</strong><small>{totals.totalHours.toLocaleString()} hours</small></div>
        </div>

        <div className="rom-input-grid">
          <label>Vendor<select value={vendor} onChange={(event) => setVendor(event.target.value as RomVendor)} required>{romVendors.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label>Hourly blended rate<input type="number" min="0" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="Optional" /></label>
          <label>Task order<input value={taskOrder} onChange={(event) => setTaskOrder(event.target.value)} placeholder="Optional" /></label>
          <label>CLIN<input value={clin} onChange={(event) => setClin(event.target.value)} placeholder="Optional" /></label>
          <label>eBuy #<input value={eBuyNumber} onChange={(event) => setEBuyNumber(event.target.value)} placeholder="Optional" /></label>
          <label>Finance number<input value={financeNumber} onChange={(event) => setFinanceNumber(event.target.value)} placeholder="Optional" /></label>
          <div className="rom-project-field">
            <label htmlFor="rom-project">Project / VersionOne Request</label>
            <div>
              <input id="rom-project" list="rom-request-options" value={project} onChange={(event) => setProject(event.target.value)} required placeholder="Type a Request number or title" />
              <button className="secondary-button" type="button" onClick={() => void loadRequests()} disabled={!applicationConfig.versionOneEnabled || requestLoading}>{requestLoading ? 'Loading…' : requests.length ? 'Refresh Requests' : 'Load Requests'}</button>
            </div>
            <datalist id="rom-request-options">{requestOptions.map((option) => <option key={option.request.id} value={option.label} />)}</datalist>
            <small>{requests.length
              ? `${requests.length} VersionOne Requests available. Type to search by number or title.`
              : applicationConfig.versionOneEnabled
                ? 'Load live VersionOne Requests, or enter a project manually.'
                : 'Live VersionOne Requests require the localhost integration server; manual entry remains available.'}</small>
            {requestError && <p className="field-error" role="alert">{requestError}</p>}
          </div>
        </div>

        <div className="rom-hours-section">
          <div className="rom-hours-heading"><div><h3>Estimated labor</h3><p>Enter hours for each Quick ROM category. Extended cost is calculated from the blended rate.</p></div><div><span>Expense {totals.expenseHours.toLocaleString()} hrs</span><span>Capital {totals.capitalHours.toLocaleString()} hrs</span></div></div>
          <div className="table-wrap">
            <table className="rom-hours-table">
              <thead><tr><th>Task</th><th>Task description</th><th>Type</th><th>Estimated hours</th><th>Extended cost</th></tr></thead>
              <tbody>{romLineItems.map((item) => {
                const itemHours = hoursByCode[item.code];
                return <tr key={item.code}><td className="rom-task-code">{item.code}</td><td className="record-title">{item.description}</td><td><span className={`rom-cost-type ${item.costType.toLowerCase()}`}>{item.costType}</span></td><td><label className="sr-only" htmlFor={`rom-hours-${item.code}`}>Hours for {item.description}</label><input id={`rom-hours-${item.code}`} type="number" min="0" step="0.25" value={hours[item.code] ?? ''} onChange={(event) => setHours((current) => ({ ...current, [item.code]: event.target.value }))} placeholder="0" /></td><td className="rom-cost">{currency(itemHours * (numericRate ?? 0))}</td></tr>;
              })}</tbody>
              <tfoot><tr><th colSpan={3}>Total</th><td>{totals.totalHours.toLocaleString()}</td><td>{currency(totals.totalCost)}</td></tr></tfoot>
            </table>
          </div>
        </div>

        <div className="rom-form-footer">
          <p>{message ?? 'Submissions are stored only for this browser session.'}</p>
          <button className="primary-button" type="submit">Save ROM</button>
        </div>
      </form>

      <section className="rom-submissions">
        <div className="rom-card-heading"><div><p className="eyebrow">Demo storage</p><h2>ROM submissions</h2><p>Temporary records saved in this browser session.</p></div><strong>{submissions.length}</strong></div>
        {downloadError && <div className="versionone-error" role="alert"><strong>Excel download failed.</strong><p>{downloadError}</p></div>}
        <div className="table-wrap">
          <table className="rom-submissions-table">
            <thead><tr><th>Created</th><th>Vendor</th><th>Project</th><th>Rate</th><th>Hours</th><th>ROM</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{submissions.map((submission) => <tr key={submission.id}><td>{shortDate(submission.createdAt)}</td><td><strong>{submission.vendor}</strong></td><td className="record-title">{submission.project}</td><td>{submission.hourlyRate === null ? '—' : currency(submission.hourlyRate)}</td><td>{submission.totalHours.toLocaleString()}</td><td className="rom-cost">{currency(submission.totalCost)}</td><td><div className="rom-row-actions"><button className="secondary-button" type="button" onClick={() => void downloadSubmission(submission)}>Download Excel</button><button className="text-button rom-delete" type="button" onClick={() => deleteSubmission(submission.id)}>Remove</button></div></td></tr>)}</tbody>
          </table>
          {submissions.length === 0 && <p className="empty-state">No ROM submissions have been saved in this session.</p>}
        </div>
      </section>
    </section>
  );
}
