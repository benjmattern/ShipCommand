export interface ProgressStatus {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
}

export const progressStatuses: ProgressStatus[] = [
  { id: 'not-started', name: 'Not Started', displayOrder: 1, active: true },
  { id: 'in-progress', name: 'In Progress', displayOrder: 2, active: true },
  { id: 'blocked', name: 'Blocked', displayOrder: 3, active: true },
  { id: 'complete', name: 'Complete', displayOrder: 4, active: true },
  { id: 'not-applicable', name: 'Not Applicable', displayOrder: 5, active: true },
];

const statusesById = new Map(progressStatuses.map((status) => [status.id, status]));

export function getProgressStatus(id: string) {
  return statusesById.get(id);
}

export function getProgressStatusName(id: string) {
  return getProgressStatus(id)?.name ?? 'Not Started';
}

export function normalizeProgressStatusId(id: string) {
  return getProgressStatus(id)?.active ? id : 'not-started';
}
