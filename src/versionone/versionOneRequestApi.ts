import type { VersionOneRequest, VersionOneRequestsResponse } from './versionOneRequestTypes';

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isRequest(value: unknown): value is VersionOneRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as Partial<VersionOneRequest>;
  return typeof request.id === 'string'
    && nullableString(request.oid)
    && nullableString(request.href)
    && nullableString(request.number)
    && nullableString(request.name)
    && nullableString(request.assetState)
    && nullableString(request.status)
    && nullableString(request.priority)
    && nullableString(request.ownerName);
}

function isRequestsResponse(value: unknown): value is VersionOneRequestsResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<VersionOneRequestsResponse>;
  return typeof response.recordCount === 'number'
    && typeof response.pageCount === 'number'
    && typeof response.retrievedAt === 'string'
    && typeof response.durationMs === 'number'
    && Array.isArray(response.requests)
    && response.requests.every(isRequest);
}

export async function loadVersionOneRequests(request: typeof fetch = fetch): Promise<VersionOneRequestsResponse> {
  const response = await request('/api/versionone/requests', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const payload: unknown = await response.json();
  if (response.ok && isRequestsResponse(payload)) return payload;
  const error = payload as { message?: unknown };
  throw new Error(typeof error.message === 'string' ? error.message : 'VersionOne requests could not be retrieved.');
}
