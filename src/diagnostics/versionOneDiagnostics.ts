import type { ConnectionTestResult } from './diagnosticTypes';

export const versionOneStoryEndpoint = 'https://versionone.usps.gov/v1/rest-1.v1/Data/Story';
export const versionOneDiagnosticRelease = '27.0.0.0';

type DiagnosticFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function buildVersionOneDiagnosticUrl() {
  const url = new URL(versionOneStoryEndpoint);
  url.search = new URLSearchParams({
    sel: 'Name,Number,AssetState,Status.Name,Scope.Name,Team.Name,Owners.Name',
    where: `Scope.Name='${versionOneDiagnosticRelease}'`,
    page: '5,0',
  }).toString();
  return url;
}

function classifyReadableResponse(
  response: Response,
  attemptedAt: string,
  durationMs: number,
  responseText: string,
): ConnectionTestResult {
  const contentType = response.headers.get('content-type');
  const trimmedResponse = responseText.trimStart();
  const responseLooksLikeXml = /^<\?xml\b/i.test(trimmedResponse)
    || /^<(?:Assets|Asset)\b/i.test(trimmedResponse);
  const responseLooksLikeVersionOne = responseLooksLikeXml
    && /<(?:Assets|Asset)\b/i.test(responseText)
    && /\bStory\b/i.test(responseText);
  const responseLooksLikeHtml = /^(?:<!doctype\s+html|<html)\b/i.test(trimmedResponse)
    || contentType?.toLowerCase().includes('text/html') === true;
  const contentTypeLooksLikeXml = contentType?.toLowerCase().includes('xml') === true;
  const responseSizeBytes = new TextEncoder().encode(responseText).byteLength;

  let message: string;
  if (response.status === 401) {
    message = 'VersionOne returned 401 Unauthorized.';
  } else if (response.status === 403) {
    message = 'VersionOne returned 403 Forbidden.';
  } else if (responseLooksLikeHtml) {
    message = 'A response was received, but it appears to be HTML rather than VersionOne XML. Authentication may have redirected to a login page.';
  } else if (!response.ok) {
    message = `VersionOne returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`;
  } else if (responseLooksLikeXml && responseLooksLikeVersionOne && contentTypeLooksLikeXml) {
    message = 'Connected to VersionOne and received an XML response.';
  } else if (responseLooksLikeXml && responseLooksLikeVersionOne) {
    message = 'VersionOne XML indicators were found, but the response content type was unexpected.';
  } else if (responseLooksLikeXml) {
    message = 'An XML response was received, but VersionOne response indicators were inconclusive.';
  } else {
    message = 'A readable response was received, but its format was not recognized as VersionOne XML.';
  }

  return {
    status: response.ok && responseLooksLikeXml && responseLooksLikeVersionOne && contentTypeLooksLikeXml
      ? 'connected'
      : 'warning',
    attemptedAt,
    durationMs,
    httpStatus: response.status,
    httpStatusText: response.statusText || null,
    contentType,
    responseSizeBytes,
    responseLooksLikeXml,
    responseLooksLikeVersionOne,
    message,
    technicalDetail: responseLooksLikeHtml
      ? 'Readable HTML response received; the response body was discarded.'
      : 'Readable HTTP response received; the response body was discarded.',
  };
}

export async function runVersionOneConnectionTest(
  request: DiagnosticFetch = fetch,
): Promise<ConnectionTestResult> {
  const attemptedAt = new Date().toISOString();
  const startedAt = performance.now();

  try {
    const response = await request(buildVersionOneDiagnosticUrl(), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/xml, text/xml' },
    });
    const responseText = await response.text();
    return classifyReadableResponse(
      response,
      attemptedAt,
      Math.round(performance.now() - startedAt),
      responseText,
    );
  } catch (error) {
    const technicalDetail = error instanceof Error
      ? `${error.name}: ${error.message}`
      : 'The browser reported an unknown request failure.';
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
      message: 'The browser could not read the VersionOne response. This may indicate CORS restrictions, authentication behavior, certificate policy, or network access.',
      technicalDetail,
    };
  }
}
