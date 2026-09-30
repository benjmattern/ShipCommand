import type { VersionOneRequest } from './versionOneRequestTypes';

export const VERSIONONE_REQUEST_ORDER_STORAGE_KEY = 'shipcommand.versionone-request-order.v1';

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readVersionOneRequestOrder(storage: SessionStorageLike): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(VERSIONONE_REQUEST_ORDER_STORAGE_KEY) ?? '[]');
    return Array.isArray(value) && value.every((item) => typeof item === 'string')
      ? Array.from(new Set(value))
      : [];
  } catch {
    return [];
  }
}

export function writeVersionOneRequestOrder(storage: SessionStorageLike, order: string[]) {
  try {
    storage.setItem(VERSIONONE_REQUEST_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // The Requests page remains usable when browser storage is unavailable.
  }
}

export function reconcileVersionOneRequestOrder(
  requests: VersionOneRequest[],
  preferredOrder: string[],
) {
  const availableIds = new Set(requests.map((request) => request.id));
  const reconciled: string[] = [];
  const includedIds = new Set<string>();

  for (const id of preferredOrder) {
    if (availableIds.has(id) && !includedIds.has(id)) {
      reconciled.push(id);
      includedIds.add(id);
    }
  }

  for (const request of requests) {
    if (!includedIds.has(request.id)) {
      reconciled.push(request.id);
      includedIds.add(request.id);
    }
  }

  return reconciled;
}

export function orderVersionOneRequests(requests: VersionOneRequest[], order: string[]) {
  const positions = new Map(order.map((id, index) => [id, index]));
  return [...requests].sort((left, right) => (
    (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    || left.id.localeCompare(right.id)
  ));
}

export function moveVersionOneRequest(order: string[], draggedId: string, targetId: string) {
  if (draggedId === targetId) return order;
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0) return order;

  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
