export interface VersionOneRequest {
  id: string;
  oid: string | null;
  href: string | null;
  number: string | null;
  name: string | null;
  assetState: string | null;
  status: string | null;
  priority: string | null;
  ownerName: string | null;
}

export interface VersionOneRequestsResponse {
  recordCount: number;
  pageCount: number;
  retrievedAt: string;
  durationMs: number;
  requests: VersionOneRequest[];
}

export type VersionOneRequestSortField = 'number' | 'name' | 'priority' | 'status' | 'ownerName' | 'assetState';
export type SortDirection = 'ascending' | 'descending';
