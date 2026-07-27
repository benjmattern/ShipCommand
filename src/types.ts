export type SourceKey = 'excel' | 'sharepoint' | 'servicenow';

export interface ServiceAssignment {
  microserviceId: string;
  involvementTypeId: string;
  applicablePhaseIds: string[];
}

export interface DataRecord {
  id: string;
  raidId: string;
  source: SourceKey;
  title: string;
  priority: number;
  release?: string;
  status: string;
  customer?: string;
  serviceAssignments: ServiceAssignment[];
  unknownServiceLabels?: string[];
  updatedAt?: string;
  summary?: string;
}
