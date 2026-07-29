# Backlog

This is a directional backlog, not a delivery commitment. Prefer validated vertical slices.

## Next candidate increments

1. **Complete:** Release Planning Slice 1 schedule data-model foundation.
2. Add read-only Release and phase schedule display.
3. Add schedule CRUD and date validation UI.
4. Add Release/phase boundary warnings.
5. Add a read-only User Story slice from an approved VersionOne export or fixture.
6. Relate normalized User Stories to Release and RAID scope.
7. Add one read-only testing slice from ALM data.

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
