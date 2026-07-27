import { applyDefaultPhases, getInvolvementType } from './involvementTypes';
import { microservices } from './microservices';
import { normalizePhaseIds } from './phases';
import { reconcilePhaseProgress } from './phaseProgress';
import type { ServiceAssignment } from './types';

const activeMicroserviceIds = new Set(microservices.filter((service) => service.active).map((service) => service.id));

export function createDefaultServiceAssignment(
  microserviceId: string,
  involvementTypeId = 'full-delivery',
): ServiceAssignment {
  const validTypeId = getInvolvementType(involvementTypeId)?.active ? involvementTypeId : 'full-delivery';
  const applicablePhaseIds = applyDefaultPhases(validTypeId);
  return {
    microserviceId,
    involvementTypeId: validTypeId,
    applicablePhaseIds,
    phaseProgress: reconcilePhaseProgress(applicablePhaseIds),
  };
}

export function normalizeServiceAssignments(assignments: ServiceAssignment[]) {
  const seenMicroservices = new Set<string>();

  return assignments.flatMap((assignment) => {
    if (!activeMicroserviceIds.has(assignment.microserviceId) || seenMicroservices.has(assignment.microserviceId)) return [];
    seenMicroservices.add(assignment.microserviceId);

    const validType = getInvolvementType(assignment.involvementTypeId);
    const involvementTypeId = validType?.active ? validType.id : 'full-delivery';
    const applicablePhaseIds = validType?.active
      ? normalizePhaseIds(assignment.applicablePhaseIds)
      : applyDefaultPhases(involvementTypeId);
    return [{
      microserviceId: assignment.microserviceId,
      involvementTypeId,
      applicablePhaseIds,
      phaseProgress: reconcilePhaseProgress(applicablePhaseIds, assignment.phaseProgress),
    }];
  });
}
