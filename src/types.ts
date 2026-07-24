export type SourceKey = 'excel' | 'sharepoint' | 'servicenow';

export interface DataRecord {
  id: string;
  raidId: string;
  source: SourceKey;
  title: string;
  priority: number;
  release?: string;
  status: string;
  customer?: string;
  services?: string;
  updatedAt?: string;
  summary?: string;
}
