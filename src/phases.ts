export type PhaseProgressMode = 'percentage' | 'boolean';

export interface DeliveryPhase {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
  progressMode: PhaseProgressMode;
}

export const deliveryPhases: DeliveryPhase[] = [
  { id: 'requirements', name: 'Requirements Gathering and Writing', displayOrder: 1, active: true, progressMode: 'percentage' },
  { id: 'dev-unit-testing', name: 'DEV / Unit Testing', displayOrder: 2, active: true, progressMode: 'percentage' },
  { id: 'sit', name: 'SIT', displayOrder: 3, active: true, progressMode: 'percentage' },
  { id: 'e2e', name: 'E2E', displayOrder: 4, active: true, progressMode: 'percentage' },
  { id: 'regression', name: 'Regression', displayOrder: 5, active: true, progressMode: 'percentage' },
  { id: 'cat-ready', name: 'CAT Ready', displayOrder: 6, active: true, progressMode: 'boolean' },
  { id: 'cat-execution', name: 'CAT Execution', displayOrder: 7, active: true, progressMode: 'percentage' },
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

export function getPhaseDefinition(phaseId: string) {
  return deliveryPhases.find((phase) => phase.id === phaseId);
}

export function getPhaseProgressMode(phaseId: string): PhaseProgressMode {
  return getPhaseDefinition(phaseId)?.progressMode ?? 'percentage';
}

export function isBooleanPhase(phaseId: string) {
  return getPhaseProgressMode(phaseId) === 'boolean';
}
