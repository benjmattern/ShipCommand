import { useState } from 'react';
import { applyDefaultPhases, involvementTypes } from './involvementTypes';
import { microservices } from './microservices';
import { deliveryPhases, normalizePhaseIds } from './phases';
import { createDefaultServiceAssignment, normalizeServiceAssignments } from './serviceAssignments';
import type { ServiceAssignment } from './types';

interface ServiceAssignmentEditorProps {
  initialAssignments: ServiceAssignment[];
  unknownLabels?: string[];
}

export function ServiceAssignmentEditor({ initialAssignments, unknownLabels }: ServiceAssignmentEditorProps) {
  const [assignments, setAssignments] = useState(() => normalizeServiceAssignments(initialAssignments));

  function toggleService(microserviceId: string, selected: boolean) {
    setAssignments((current) => selected
      ? normalizeServiceAssignments([...current, createDefaultServiceAssignment(microserviceId)])
      : current.filter((assignment) => assignment.microserviceId !== microserviceId));
  }

  function changeInvolvement(microserviceId: string, involvementTypeId: string) {
    setAssignments((current) => current.map((assignment) => assignment.microserviceId === microserviceId
      ? { ...assignment, involvementTypeId, applicablePhaseIds: applyDefaultPhases(involvementTypeId) }
      : assignment));
  }

  function togglePhase(microserviceId: string, phaseId: string, selected: boolean) {
    setAssignments((current) => current.map((assignment) => {
      if (assignment.microserviceId !== microserviceId) return assignment;
      const phaseIds = selected
        ? [...assignment.applicablePhaseIds, phaseId]
        : assignment.applicablePhaseIds.filter((id) => id !== phaseId);
      return { ...assignment, applicablePhaseIds: normalizePhaseIds(phaseIds) };
    }));
  }

  return (
    <fieldset className="full-field service-fieldset">
      <legend>Impacted microservices</legend>
      <p>Select services, then configure their involvement and applicable phases.</p>
      <div className="service-options">
        {microservices.map((service) => {
          const selected = assignments.some((assignment) => assignment.microserviceId === service.id);
          return (
            <label key={service.id}>
              <input type="checkbox" checked={selected} onChange={(event) => toggleService(service.id, event.target.checked)} />
              <span>{service.name}</span>
            </label>
          );
        })}
      </div>

      {assignments.length > 0 && (
        <div className="assignment-editor-list">
          {assignments.map((assignment) => {
            const service = microservices.find((item) => item.id === assignment.microserviceId);
            return (
              <article className="assignment-editor" key={assignment.microserviceId}>
                <div className="assignment-editor-heading">
                  <strong>{service?.name ?? assignment.microserviceId}</strong>
                  <select
                    name={`assignmentType:${assignment.microserviceId}`}
                    value={assignment.involvementTypeId}
                    onChange={(event) => changeInvolvement(assignment.microserviceId, event.target.value)}
                    aria-label={`${service?.name} involvement type`}
                  >
                    {involvementTypes.filter((type) => type.active).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                </div>
                <div className="phase-options">
                  {deliveryPhases.filter((phase) => phase.active).map((phase) => (
                    <label key={phase.id}>
                      <input
                        type="checkbox"
                        name={`assignmentPhases:${assignment.microserviceId}`}
                        value={phase.id}
                        checked={assignment.applicablePhaseIds.includes(phase.id)}
                        onChange={(event) => togglePhase(assignment.microserviceId, phase.id, event.target.checked)}
                      />
                      <span>{phase.name}</span>
                    </label>
                  ))}
                </div>
                {assignment.applicablePhaseIds.length === 0 && <p className="phase-warning">No phases selected.</p>}
              </article>
            );
          })}
        </div>
      )}

      {unknownLabels?.length ? (
        <div className="unmapped-services form-unmapped">
          <strong>Preserved unmapped workbook values</strong>
          <p>{unknownLabels.join(', ')}</p>
        </div>
      ) : null}
    </fieldset>
  );
}
