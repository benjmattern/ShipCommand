export type SourceKey = 'excel' | 'sharepoint' | 'servicenow';

export interface DataRecord {
  id: string;
  source: SourceKey;
  title: string;
  status: string;
  updatedAt: string;
  summary?: string;
}
