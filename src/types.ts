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
  impactedMicroserviceIds: string[];
  unknownServiceLabels?: string[];
  updatedAt?: string;
  summary?: string;
}
