import { useRef, useState } from 'react';
import type { ConnectionTestResult } from './diagnosticTypes';
import {
  runVersionOneConnectionTest,
  versionOneDiagnosticRelease,
  versionOneStoryEndpoint,
} from './versionOneDiagnostics';

const initialResult: ConnectionTestResult = {
  status: 'idle',
  attemptedAt: null,
  durationMs: null,
  httpStatus: null,
  httpStatusText: null,
  contentType: null,
  responseSizeBytes: null,
  responseLooksLikeXml: null,
  responseLooksLikeVersionOne: null,
  message: 'Run the test through the ShipCommand Local Integration API.',
  technicalDetail: null,
  requestPath: null,
};

const statusLabels: Record<ConnectionTestResult['status'], string> = {
  idle: 'Not tested',
  testing: 'Testing',
  connected: 'Connected',
  warning: 'Response received with warning',
  failed: 'Failed',
};

function yesNo(value: boolean | null) {
  if (value === null) return 'Not available';
  return value ? 'Yes' : 'No';
}

export function VersionOneDiagnosticCard() {
  const [result, setResult] = useState(initialResult);
  const running = useRef(false);

  async function runTest() {
    if (running.current) return;
    running.current = true;
    setResult({ ...initialResult, status: 'testing', message: 'Testing VersionOne through the ShipCommand Local Integration API…' });
    const nextResult = await runVersionOneConnectionTest();
    setResult(nextResult);
    running.current = false;
  }

  const isTesting = result.status === 'testing';

  return (
    <article className="diagnostic-card">
      <div className="diagnostic-card-heading">
        <div>
          <p className="eyebrow">Enterprise connection</p>
          <h2>VersionOne</h2>
        </div>
        <span className={`diagnostic-status diagnostic-status-${result.status}`}>{statusLabels[result.status]}</span>
      </div>

      <dl className="diagnostic-context">
        <div><dt>Connection path</dt><dd>ShipCommand → Local Integration API → VersionOne</dd></div>
        <div><dt>VersionOne endpoint</dt><dd>{versionOneStoryEndpoint}<small>The browser calls only the same-origin local API.</small></dd></div>
        <div><dt>Release test scope</dt><dd>{versionOneDiagnosticRelease}</dd></div>
      </dl>

      <div className="diagnostic-message" aria-live="polite">
        <strong>{statusLabels[result.status]}</strong>
        <p>{result.message}</p>
      </div>

      {result.status !== 'idle' && result.status !== 'testing' && (
        <dl className="diagnostic-results">
          <div><dt>Attempted</dt><dd>{result.attemptedAt ? new Date(result.attemptedAt).toLocaleString() : 'Not available'}</dd></div>
          <div><dt>Duration</dt><dd>{result.durationMs === null ? 'Not available' : `${result.durationMs} ms`}</dd></div>
          <div><dt>HTTP status</dt><dd>{result.httpStatus === null ? 'No readable response' : `${result.httpStatus}${result.httpStatusText ? ` ${result.httpStatusText}` : ''}`}</dd></div>
          <div><dt>Content type</dt><dd>{result.contentType ?? 'Not available'}</dd></div>
          <div><dt>Response size</dt><dd>{result.responseSizeBytes === null ? 'Not available' : `${result.responseSizeBytes.toLocaleString()} bytes`}</dd></div>
          <div><dt>XML detected</dt><dd>{yesNo(result.responseLooksLikeXml)}</dd></div>
          <div><dt>VersionOne response detected</dt><dd>{yesNo(result.responseLooksLikeVersionOne)}</dd></div>
          <div><dt>Request path</dt><dd>{result.requestPath === 'local-api' ? 'Local Integration API' : 'Not available'}</dd></div>
        </dl>
      )}

      {result.technicalDetail && <p className="diagnostic-technical-detail"><strong>Technical detail:</strong> {result.technicalDetail}</p>}

      <div className="diagnostic-actions">
        <button className="primary-button" type="button" onClick={runTest} disabled={isTesting}>
          {isTesting ? 'Testing…' : result.status === 'idle' ? 'Run connection test' : 'Run again'}
        </button>
      </div>
    </article>
  );
}
