export type IsoDate = string;

export interface PhaseSchedule {
  phaseId: string;
  plannedStartDate: IsoDate | null;
  plannedEndDate: IsoDate | null;
}

export interface ReleaseSchedule {
  releaseId: string;
  plannedStartDate: IsoDate | null;
  plannedEndDate: IsoDate | null;
  phaseSchedules: PhaseSchedule[];
}

export interface ScheduleValidationIssue {
  scope: 'collection' | 'release' | 'phase';
  code: string;
  message: string;
  releaseId?: string;
  phaseId?: string;
}
