export type SourceKey = 'excel' | 'sharepoint' | 'servicenow';

export interface DataRecord {
  id: string;
  raidId: string;
  source: SourceKey;
  title: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: string;
  updatedAt: string;
  summary?: string;
}
