# Backlog

This is a directional backlog, not a delivery commitment. Prefer validated vertical slices.

## Next candidate increments

1. **Complete:** Release Planning Slice 1 schedule data-model foundation.
2. **Complete:** Read-only Release Schedule display, including the overall Release window, ordered phase dates, and partial and empty states.
3. **Complete:** Session-only Release Schedule creation, overall and phase editing, isolated draft cancellation, structural validation messages, clear behavior, and normalized in-memory state.
4. Add Release/phase boundary warnings and phase-overlap warnings.
5. Add actual dates and schedule variance.
6. Add a read-only User Story slice from an approved VersionOne export or fixture.
7. Relate normalized User Stories to Release and RAID scope.
8. Add one read-only testing slice from ALM data.

## Platform foundations to validate

- Source reference and provenance model
- Connector diagnostics and unknown-field handling
- Cross-system identity and relationship ownership
- Refresh, conflict, stale-record, and deletion behavior
- Durable ShipCommand-owned metadata
- Authentication and authorization requirements
- Audit and history expectations

## Planned modules

- Story delivery
- Testing and results
- ServiceNow change governance
- SharePoint documentation and approvals
- Financial estimates and funding
- Scheduling and dependencies
- Portfolio reporting and retrospective analytics

## Deferred

- Persistent schedule storage and schedule audit history
- Schedule workbook import/export
- Release-boundary, overlap, and chronological warnings
- Actual schedule dates and variance
- Cross-release planning
- Enterprise-system write-back
- Full release-by-service-by-phase matrix
- Progress history and audit events before persistence
- RAID splitting and split identifiers such as `RAID ID 417.1`
- Links followed by true file attachments
- Configurable Settings and reference-data administration
- Notifications and approval workflows
- Cross-release timeline and Gantt visualization
- Production deployment

## Guardrails

- Do not replace systems of record.
- Do not duplicate derived release state.
- Do not create a universal connector abstraction before a second real integration validates it.
- Do not modify the root `backlog.md` as part of this documentation set.
