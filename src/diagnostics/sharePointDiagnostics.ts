import { getApiUrl } from '../config';

export type SharePointResponseKind = 'json' | 'xml' | 'html' | 'empty' | 'unknown';
export type SharePointAuthenticationOutcome =
  | 'authenticated-response' | 'login-page' | 'redirect' | 'unauthorized' | 'forbidden'
  | 'timeout' | 'unreachable' | 'upstream-error' | 'not-configured' | 'unknown';

export interface SharePointDiagnosticResult {
  ok: boolean;
  configured: boolean;
  system: 'sharepoint';
  durationMs: number;
  upstreamStatus: number | null;
  contentType: string | null;
  responseKind: SharePointResponseKind;
  authenticationOutcome: SharePointAuthenticationOutcome;
  redirectDetected: boolean;
  loginPageDetected: boolean;
  sharePointDetected: boolean;
  message: string;
}

export const sharePointDiagnosticApiPath = '/api/sharepoint/test';

function isSharePointResult(value: unknown): value is SharePointDiagnosticResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SharePointDiagnosticResult>;
  return candidate.system === 'sharepoint'
    && typeof candidate.ok === 'boolean'
    && typeof candidate.configured === 'boolean'
    && typeof candidate.durationMs === 'number'
    && typeof candidate.message === 'string'
    && typeof candidate.responseKind === 'string'
    && typeof candidate.authenticationOutcome === 'string'
    && typeof candidate.redirectDetected === 'boolean'
    && typeof candidate.loginPageDetected === 'boolean'
    && typeof candidate.sharePointDetected === 'boolean';
}

export async function runSharePointConnectionTest(
  request: typeof fetch = fetch,
): Promise<SharePointDiagnosticResult> {
  try {
    const response = await request(getApiUrl(sharePointDiagnosticApiPath), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const payload: unknown = await response.json();
    if (!isSharePointResult(payload)) throw new Error('Invalid local diagnostic response.');
    return payload;
  } catch {
    return {
      ok: false,
      configured: true,
      system: 'sharepoint',
      durationMs: 0,
      upstreamStatus: null,
      contentType: null,
      responseKind: 'unknown',
      authenticationOutcome: 'unreachable',
      redirectDetected: false,
      loginPageDetected: false,
      sharePointDetected: false,
      message: 'ShipCommand could not read a SharePoint diagnostic result from the Local Integration API.',
    };
  }
}
