export type ServiceNowResponseKind = 'json' | 'xml' | 'html' | 'empty' | 'unknown';
export type ServiceNowAuthenticationOutcome =
  | 'authenticated-response'
  | 'login-page'
  | 'redirect'
  | 'unauthorized'
  | 'forbidden'
  | 'timeout'
  | 'upstream-error'
  | 'not-configured'
  | 'unreachable'
  | 'unknown';

export interface ServiceNowDiagnosticResult {
  ok: boolean;
  configured: boolean;
  system: 'servicenow';
  durationMs: number;
  upstreamStatus: number | null;
  contentType: string | null;
  responseKind: ServiceNowResponseKind;
  authenticationOutcome: ServiceNowAuthenticationOutcome;
  redirectDetected: boolean;
  loginPageDetected: boolean;
  serviceNowDetected: boolean;
  message: string;
}

export const serviceNowDiagnosticApiPath = '/api/servicenow/test';

function isServiceNowResult(value: unknown): value is ServiceNowDiagnosticResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ServiceNowDiagnosticResult>;
  return candidate.system === 'servicenow'
    && typeof candidate.ok === 'boolean'
    && typeof candidate.configured === 'boolean'
    && typeof candidate.durationMs === 'number'
    && typeof candidate.message === 'string'
    && typeof candidate.responseKind === 'string'
    && typeof candidate.authenticationOutcome === 'string'
    && typeof candidate.redirectDetected === 'boolean'
    && typeof candidate.loginPageDetected === 'boolean'
    && typeof candidate.serviceNowDetected === 'boolean';
}

export async function runServiceNowConnectionTest(
  request: typeof fetch = fetch,
): Promise<ServiceNowDiagnosticResult> {
  try {
    const response = await request(serviceNowDiagnosticApiPath, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const payload: unknown = await response.json();
    if (!isServiceNowResult(payload)) throw new Error('Invalid local diagnostic response.');
    return payload;
  } catch {
    return {
      ok: false,
      configured: true,
      system: 'servicenow',
      durationMs: 0,
      upstreamStatus: null,
      contentType: null,
      responseKind: 'unknown',
      authenticationOutcome: 'unreachable',
      redirectDetected: false,
      loginPageDetected: false,
      serviceNowDetected: false,
      message: 'ShipCommand could not read a ServiceNow diagnostic result from the Local Integration API.',
    };
  }
}
