export interface DeliveryPhase {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
}

export const deliveryPhases: DeliveryPhase[] = [
  { id: 'requirements', name: 'Requirements Gathering and Writing', displayOrder: 1, active: true },
  { id: 'dev-unit-testing', name: 'DEV / Unit Testing', displayOrder: 2, active: true },
  { id: 'sit', name: 'SIT', displayOrder: 3, active: true },
  { id: 'e2e', name: 'E2E', displayOrder: 4, active: true },
  { id: 'regression', name: 'Regression', displayOrder: 5, active: true },
  { id: 'cat-ready', name: 'CAT Ready', displayOrder: 6, active: true },
  { id: 'cat-execution', name: 'CAT Execution', displayOrder: 7, active: true },
];

const phaseNames = new Map(deliveryPhases.map((phase) => [phase.id, phase.name]));
const activePhaseIds = new Set(deliveryPhases.filter((phase) => phase.active).map((phase) => phase.id));

export function normalizePhaseIds(ids: string[]) {
  const selected = new Set(ids.filter((id) => activePhaseIds.has(id)));
  return deliveryPhases.filter((phase) => selected.has(phase.id)).map((phase) => phase.id);
}

export function getPhaseNames(ids: string[]) {
  return normalizePhaseIds(ids).map((id) => phaseNames.get(id)!);
}
