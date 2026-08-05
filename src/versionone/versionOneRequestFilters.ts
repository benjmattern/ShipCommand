import type {
  SortDirection,
  VersionOneRequest,
  VersionOneRequestSortField,
  VersionOneRequestView,
} from './versionOneRequestTypes';

export const DEFAULT_INTAKE_PLANNING_LEVEL = 'MEPT: Package Platform-4724';
export const ACTIVE_ASSET_STATE = '64';
const RELEASE_PLANNING_LEVEL_PATTERN = /^\d+\.\d+\.\d+\.\d+$/;

export function isReleasePlanningLevel(value: string | null | undefined) {
  return RELEASE_PLANNING_LEVEL_PATTERN.test(value ?? '');
}

export function filterVersionOneRequests(
  requests: VersionOneRequest[],
  search: string,
  status: string,
  priority: string,
  owner: string,
  planningLevelName: string,
  assetState: string,
  view: VersionOneRequestView,
) {
  const query = search.trim().toLocaleLowerCase();
  return requests.filter((request) => (
    (!query
      || request.number?.toLocaleLowerCase().includes(query)
      || request.name?.toLocaleLowerCase().includes(query))
    && (!status || request.status === status)
    && (!priority || request.priority === priority)
    && (!owner || request.ownerName === owner)
    && (!planningLevelName || request.planningLevelName === planningLevelName)
    && (!assetState || request.assetState === assetState)
    && matchesRequestView(request, view)
  ));
}

export function matchesRequestView(request: VersionOneRequest, view: VersionOneRequestView) {
  if (view === 'active-intake') {
    return request.planningLevelName === DEFAULT_INTAKE_PLANNING_LEVEL
      && request.assetState === ACTIVE_ASSET_STATE;
  }
  if (view === 'all-active') return request.assetState === ACTIVE_ASSET_STATE;
  if (view === 'release-assigned') return isReleasePlanningLevel(request.planningLevelName);
  return true;
}

export function requestFilterOptions(
  requests: VersionOneRequest[],
  field: 'status' | 'priority' | 'ownerName' | 'planningLevelName' | 'assetState',
) {
  return Array.from(new Set(
    requests.map((request) => request[field]).filter((value): value is string => Boolean(value)),
  )).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

export function sortVersionOneRequests(
  requests: VersionOneRequest[],
  field: VersionOneRequestSortField,
  direction: SortDirection,
) {
  const multiplier = direction === 'ascending' ? 1 : -1;
  return [...requests].sort((left, right) => {
    const result = (left[field] ?? '').localeCompare(right[field] ?? '', undefined, {
      numeric: field === 'number' || field === 'planningLevelName',
      sensitivity: 'base',
    });
    return multiplier * (result || left.id.localeCompare(right.id));
  });
}
