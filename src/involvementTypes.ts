import { deliveryPhases } from './phases';

export interface ServiceInvolvementType {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
  defaultPhaseIds: string[];
}

const allPhaseIds = deliveryPhases.map((phase) => phase.id);

export const involvementTypes: ServiceInvolvementType[] = [
  { id: 'full-delivery', name: 'Full Delivery', displayOrder: 1, active: true, defaultPhaseIds: allPhaseIds },
  { id: 'testing-support', name: 'Testing Support', displayOrder: 2, active: true, defaultPhaseIds: ['requirements', 'sit', 'e2e', 'regression'] },
  { id: 'requirements-only', name: 'Requirements Only', displayOrder: 3, active: true, defaultPhaseIds: ['requirements'] },
  { id: 'custom', name: 'Custom', displayOrder: 4, active: true, defaultPhaseIds: [] },
];

const involvementTypesById = new Map(involvementTypes.map((type) => [type.id, type]));

export function getInvolvementType(id: string) {
  return involvementTypesById.get(id);
}

export function getInvolvementTypeName(id: string) {
  return getInvolvementType(id)?.name ?? 'Unknown involvement';
}

export function applyDefaultPhases(involvementTypeId: string) {
  return [...(getInvolvementType(involvementTypeId)?.defaultPhaseIds ?? involvementTypes[0].defaultPhaseIds)];
}
