export type SourceKey = 'excel' | 'sharepoint' | 'servicenow';

export interface PhaseProgress {
  phaseId: string;
  statusId: string;
  percentComplete: number;
  note?: string;
}

export interface ServiceAssignment {
  microserviceId: string;
  involvementTypeId: string;
  applicablePhaseIds: string[];
  phaseProgress: PhaseProgress[];
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
