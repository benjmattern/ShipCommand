# Backlog

This is a directional backlog, not a delivery commitment. Prefer validated vertical slices.

## Next candidate increments

1. **Complete:** Release Planning Slice 1 schedule data-model foundation.
2. **Complete:** Read-only Release Schedule display, including the overall Release window, ordered phase dates, and partial and empty states.
3. **Complete:** Session-only Release Schedule creation, overall and phase editing, isolated draft cancellation, structural validation messages, clear behavior, and normalized in-memory state.
4. **Complete:** Phase progress-mode metadata, Boolean CAT Ready display and editing, numeric compatibility helpers, and rollup compatibility review.
5. **Complete:** Diagnostics page and direct-browser VersionOne feasibility test; confirmed unreadable browser-fetch failure.
6. **Complete:** Local Integration API server, committed-demo serving, `/api/versionone/test`, same-origin React diagnostic, and sanitized results.
7. **Complete:** Validate PowerShell `-UseDefaultCredentials` connectivity on the USPS work computer.
8. **Complete:** Switch inspection to R29, validate Release input, retrieve paged Stories, parse XML, normalize records, and add the read-only Story Explorer with search/status/team filters.
9. **Complete:** Retrieve VersionOne Defects alongside Stories, classify B-/D-/Other records server-side, and add Type counts, badges, search, and filtering.
10. **Complete:** Query arbitrary validated VersionOne releases, switch the Story Explorer explicitly between releases, preserve Story/Defect retrieval, and provide release-specific loading, refresh, empty, and error behavior.
11. Validate full R29 and an additional release: Story and Defect statuses, teams, owners, missing fields, duplicates, asset conventions, and anomalies.
12. Determine Story/Defect-to-RAID and Story-to-Feature relationship rules and a governed stable identifier.
13. Add Release/phase boundary warnings and phase-overlap warnings.
14. Add actual dates and schedule variance.
15. Add one read-only testing slice from ALM data.

## Platform foundations to validate

- Determine the approved production authentication architecture
- Parse VersionOne XML, define the normalized Story contract, add paging, and validate a release parameter
- Display selected-Release stories and associate them with ShipCommand Release and RAID records
- Add ServiceNow and ALM integration slices after their access paths are validated
- Add a VersionOne Release selector, detail links, and incremental refresh or caching only after R29 inspection
- Add a VersionOne Release Catalog, configured-release synchronization, timestamps, and errors after the inspection slice
- Map VersionOne scopes to ShipCommand releases and persist configured release mappings
- Define automatic synchronization, sync timestamps, and sync error history
- Select a RAID governance field and implement deterministic Story/Defect-to-RAID matching
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
- Derived CAT readiness and story-level or SIT deployment verification
- Count-based progress and external phase synchronization
- Three-state readiness if a validated use case requires it
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
