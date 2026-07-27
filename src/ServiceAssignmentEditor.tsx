import { useState } from 'react';
import { applyDefaultPhases, involvementTypes } from './involvementTypes';
import { microservices } from './microservices';
import { deliveryPhases, normalizePhaseIds } from './phases';
import { getOrderedPhaseProgress, reconcilePhaseProgress, updatePhaseProgressPercent, updatePhaseProgressStatus } from './phaseProgress';
import { progressStatuses } from './progressStatuses';
import { createDefaultServiceAssignment, normalizeServiceAssignments } from './serviceAssignments';
import type { ServiceAssignment } from './types';

interface ServiceAssignmentEditorProps {
  initialAssignments: ServiceAssignment[];
  unknownLabels?: string[];
}

export function ServiceAssignmentEditor({ initialAssignments, unknownLabels }: ServiceAssignmentEditorProps) {
  const [assignments, setAssignments] = useState(() => normalizeServiceAssignments(initialAssignments));
  const [expandedServices, setExpandedServices] = useState<Set<string>>(() => new Set());

  function toggleService(microserviceId: string, selected: boolean) {
    setAssignments((current) => selected
      ? normalizeServiceAssignments([...current, createDefaultServiceAssignment(microserviceId)])
      : current.filter((assignment) => assignment.microserviceId !== microserviceId));
  }

  function changeInvolvement(microserviceId: string, involvementTypeId: string) {
    setAssignments((current) => current.map((assignment) => {
      if (assignment.microserviceId !== microserviceId) return assignment;
      const applicablePhaseIds = applyDefaultPhases(involvementTypeId);
      return {
        ...assignment,
        involvementTypeId,
        applicablePhaseIds,
        phaseProgress: reconcilePhaseProgress(applicablePhaseIds, assignment.phaseProgress),
      };
    }));
  }

  function togglePhase(microserviceId: string, phaseId: string, selected: boolean) {
    setAssignments((current) => current.map((assignment) => {
      if (assignment.microserviceId !== microserviceId) return assignment;
      const phaseIds = selected
        ? [...assignment.applicablePhaseIds, phaseId]
        : assignment.applicablePhaseIds.filter((id) => id !== phaseId);
      const applicablePhaseIds = normalizePhaseIds(phaseIds);
      return {
        ...assignment,
        applicablePhaseIds,
        phaseProgress: reconcilePhaseProgress(applicablePhaseIds, assignment.phaseProgress),
      };
    }));
  }

  function updateProgress(
    microserviceId: string,
    phaseId: string,
    update: (progress: ServiceAssignment['phaseProgress'][number]) => ServiceAssignment['phaseProgress'][number],
  ) {
    setAssignments((current) => current.map((assignment) => assignment.microserviceId === microserviceId
      ? {
        ...assignment,
        phaseProgress: getOrderedPhaseProgress(assignment).map((progress) => progress.phaseId === phaseId ? update(progress) : progress),
      }
      : assignment));
  }

  function toggleExpanded(microserviceId: string) {
    setExpandedServices((current) => {
      const next = new Set(current);
      if (next.has(microserviceId)) next.delete(microserviceId);
      else next.add(microserviceId);
      return next;
    });
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
            const orderedProgress = getOrderedPhaseProgress(assignment);
            const expanded = expandedServices.has(assignment.microserviceId);
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
                {orderedProgress.map((progress) => (
                  <span key={progress.phaseId}>
                    <input type="hidden" name={`progressStatus:${assignment.microserviceId}:${progress.phaseId}`} value={progress.statusId} />
                    <input type="hidden" name={`progressPercent:${assignment.microserviceId}:${progress.phaseId}`} value={progress.percentComplete} />
                    <input type="hidden" name={`progressNote:${assignment.microserviceId}:${progress.phaseId}`} value={progress.note ?? ''} />
                  </span>
                ))}
                {orderedProgress.length > 0 && (
                  <>
                    <button className="progress-toggle" type="button" onClick={() => toggleExpanded(assignment.microserviceId)}>
                      {expanded ? 'Hide phase progress' : `Edit phase progress (${orderedProgress.length})`}
                    </button>
                    {expanded && (
                      <div className="progress-editor-list">
                        {orderedProgress.map((progress) => {
                          const phase = deliveryPhases.find((item) => item.id === progress.phaseId);
                          return (
                            <div className="progress-editor" key={progress.phaseId}>
                              <strong>{phase?.name ?? progress.phaseId}</strong>
                              <select
                                value={progress.statusId}
                                onChange={(event) => updateProgress(
                                  assignment.microserviceId,
                                  progress.phaseId,
                                  (current) => updatePhaseProgressStatus(current, event.target.value),
                                )}
                                aria-label={`${phase?.name} status`}
                              >
                                {progressStatuses.filter((status) => status.active).map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
                              </select>
                              <label>
                                <span>Percent</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={progress.percentComplete}
                                  onChange={(event) => updateProgress(
                                    assignment.microserviceId,
                                    progress.phaseId,
                                    (current) => updatePhaseProgressPercent(current, Number(event.target.value)),
                                  )}
                                />
                              </label>
                              <label className="progress-note">
                                <span>Note</span>
                                <input
                                  type="text"
                                  maxLength={160}
                                  value={progress.note ?? ''}
                                  placeholder="Optional note"
                                  onChange={(event) => updateProgress(
                                    assignment.microserviceId,
                                    progress.phaseId,
                                    (current) => ({ ...current, note: event.target.value }),
                                  )}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
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
