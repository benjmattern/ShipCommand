import type {
  SortDirection,
  VersionOneRequest,
  VersionOneRequestSortField,
} from './versionOneRequestTypes';

export function filterVersionOneRequests(
  requests: VersionOneRequest[],
  search: string,
  status: string,
  priority: string,
  owner: string,
) {
  const query = search.trim().toLocaleLowerCase();
  return requests.filter((request) => (
    (!query
      || request.number?.toLocaleLowerCase().includes(query)
      || request.name?.toLocaleLowerCase().includes(query))
    && (!status || request.status === status)
    && (!priority || request.priority === priority)
    && (!owner || request.ownerName === owner)
  ));
}

export function requestFilterOptions(
  requests: VersionOneRequest[],
  field: 'status' | 'priority' | 'ownerName',
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
      numeric: field === 'number',
      sensitivity: 'base',
    });
    return multiplier * (result || left.id.localeCompare(right.id));
  });
}
