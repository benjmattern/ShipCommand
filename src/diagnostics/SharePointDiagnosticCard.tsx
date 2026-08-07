import { useRef, useState } from 'react';
import { runSharePointConnectionTest, type SharePointDiagnosticResult } from './sharePointDiagnostics';

type UiStatus = 'idle' | 'testing' | 'connected' | 'warning' | 'failed';

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

function statusFor(result: SharePointDiagnosticResult): UiStatus {
  if (result.ok) return 'connected';
  if (['not-configured', 'login-page', 'redirect', 'unauthorized', 'forbidden', 'unknown'].includes(result.authenticationOutcome)) return 'warning';
  return 'failed';
}

const statusLabels: Record<UiStatus, string> = {
  idle: 'Not tested', testing: 'Testing', connected: 'Connected',
  warning: 'Response received with warning', failed: 'Failed',
};

export function SharePointDiagnosticCard() {
  const [result, setResult] = useState<SharePointDiagnosticResult | null>(null);
  const [uiStatus, setUiStatus] = useState<UiStatus>('idle');
  const running = useRef(false);

  async function runTest() {
    if (running.current) return;
    running.current = true;
    setUiStatus('testing');
    const nextResult = await runSharePointConnectionTest();
    setResult(nextResult);
    setUiStatus(statusFor(nextResult));
    running.current = false;
  }

  return (
    <article className="diagnostic-card">
      <div className="diagnostic-card-heading">
        <div><p className="eyebrow">Enterprise connection</p><h2>SharePoint</h2></div>
        <span className={`diagnostic-status diagnostic-status-${uiStatus}`}>{statusLabels[uiStatus]}</span>
      </div>
      <dl className="diagnostic-context">
        <div><dt>Connection path</dt><dd>ShipCommand → Local Integration API → SharePoint</dd></div>
        <div><dt>Configuration</dt><dd>{result ? result.configured ? 'Configured locally' : 'Not configured' : 'Not tested'}<small>The browser cannot read or set the enterprise URL.</small></dd></div>
      </dl>
      <div className="diagnostic-message" aria-live="polite">
        <strong>{statusLabels[uiStatus]}</strong>
        <p>{uiStatus === 'testing' ? 'Testing SharePoint through the ShipCommand Local Integration API…' : result?.message ?? 'Run the read-only SharePoint connectivity test.'}</p>
      </div>
      {result && uiStatus !== 'testing' && (
        <dl className="diagnostic-results">
          <div><dt>Configured</dt><dd>{yesNo(result.configured)}</dd></div>
          <div><dt>Duration</dt><dd>{result.durationMs.toLocaleString()} ms</dd></div>
          <div><dt>Upstream status</dt><dd>{result.upstreamStatus ?? 'No readable response'}</dd></div>
          <div><dt>Content type</dt><dd>{result.contentType ?? 'Not available'}</dd></div>
          <div><dt>Response kind</dt><dd>{result.responseKind}</dd></div>
          <div><dt>Authentication outcome</dt><dd>{result.authenticationOutcome}</dd></div>
          <div><dt>Redirect detected</dt><dd>{yesNo(result.redirectDetected)}</dd></div>
          <div><dt>Login page detected</dt><dd>{yesNo(result.loginPageDetected)}</dd></div>
          <div><dt>SharePoint detected</dt><dd>{yesNo(result.sharePointDetected)}</dd></div>
        </dl>
      )}
      <div className="diagnostic-actions">
        <button className="primary-button" type="button" onClick={runTest} disabled={uiStatus === 'testing'}>
          {uiStatus === 'testing' ? 'Testing…' : result ? 'Test again' : 'Test'}
        </button>
      </div>
    </article>
  );
}
