import type { ConnectionTestResult } from './diagnosticTypes';

export const versionOneStoryEndpoint = 'https://versionone.usps.gov/v1/rest-1.v1/Data/Story';
export const versionOneDiagnosticRelease = '29.0.0.0';
export const versionOneDiagnosticApiPath = '/api/versionone/test';

type DiagnosticFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isConnectionStatus(value: unknown): value is ConnectionTestResult['status'] {
  return value === 'connected' || value === 'warning' || value === 'failed';
}

function isDiagnosticResult(value: unknown): value is ConnectionTestResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ConnectionTestResult>;
  return isConnectionStatus(candidate.status)
    && typeof candidate.message === 'string'
    && candidate.requestPath === 'local-api';
}

export async function runVersionOneConnectionTest(
  request: DiagnosticFetch = fetch,
): Promise<ConnectionTestResult> {
  const attemptedAt = new Date().toISOString();
  const startedAt = performance.now();

  try {
    const response = await request(versionOneDiagnosticApiPath, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const payload: unknown = await response.json();
    if (!isDiagnosticResult(payload)) {
      throw new Error('The local endpoint returned an invalid diagnostic result.');
    }
    return payload;
  } catch (error) {
    return {
      status: 'failed',
      attemptedAt,
      durationMs: Math.round(performance.now() - startedAt),
      httpStatus: null,
      httpStatusText: null,
      contentType: null,
      responseSizeBytes: null,
      responseLooksLikeXml: null,
      responseLooksLikeVersionOne: null,
      message: 'ShipCommand could not read a diagnostic result from the Local Integration API.',
      technicalDetail: error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown local API failure.',
      requestPath: 'local-api',
    };
  }
}
