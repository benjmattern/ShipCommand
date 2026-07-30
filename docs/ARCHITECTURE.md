# Current Implementation Architecture

This document maps the implemented browser POC. For the broader platform blueprint, see [System Architecture](SYSTEM_ARCHITECTURE.md).

- `App.tsx` owns the single in-memory RAID item array, all CRUD and priority mutations, and the session-level ReleaseStore so Release metadata survives navigation between views.
- `connectors.ts` parses `BacklogData.xlsx` into the shared `DataRecord` model.
- `releaseSelectors.ts` provides pure derived release-feature and release-summary views.
- `ReleaseTracker.tsx` renders the release overview and owns session-only schedule state; `releases/ReleaseWorkspace.tsx` composes the selected Release through reusable workspace panels.
- `releases/Release.ts` defines Release normalization, identity, record-derived initialization, metadata updates, and TSLC identifier validation.
- `releases/ReleaseStore.ts` owns selected Release identity and session-only optional Release metadata through a small native React hook.
- `raid.ts` centralizes RAID ID display formatting.
- `microservices.ts` owns controlled microservice reference data, workbook normalization, and ID-to-name resolution.
- `phases.ts` and `involvementTypes.ts` own controlled delivery reference data.
- `serviceAssignments.ts` validates assignments, removes duplicates, resolves stale values safely, and applies involvement defaults.
- `ServiceAssignmentEditor.tsx` provides native microservice, involvement, and phase controls.
- `progressStatuses.ts` owns controlled progress-status reference data.
- `phaseProgress.ts` reconciles progress with applicability, enforces status/percent rules, and derives service, RAID, and release rollups.

No duplicate release-feature state is stored. Release tracker output is recalculated from the current RAID items. Navigation uses local React view state because the POC does not need a routing dependency.

`serviceAssignments` are the RAID item source of truth. Each assignment contains a stable microservice ID, involvement type ID, and ordered applicable phase IDs. Workbook service strings are normalized during import with case-insensitive exact names and an explicit alias table. Controlled services default to Full Delivery; explicit test-only workbook labels default to Testing Support. Unrecognized labels are preserved separately and surfaced rather than guessed or discarded.

Release views derive assignment summaries from RAID state; no separate `ReleaseFeature` persistence exists.

Release identity is first-class even while existing records and schedules retain their compatible string keys. `ReleaseStore` derives normalized Releases from the current RAID collection, reconciles RAID counts, and layers optional in-memory integration metadata over those identities. Integrations enrich a Release over time rather than maintaining competing release identities. No Release metadata is persisted.

`phaseProgress` remains nested within each service assignment. The smallest progress unit is RAID item + microservice + applicable phase. Reconciliation preserves overlapping phases, creates missing defaults, and removes non-applicable or duplicate entries.

`releasePhaseSelectors.ts` derives ordered release phase summaries and per-RAID phase rollups from service-phase progress. Not Applicable entries are excluded. Phase-filter selection is local component state; no release phase data is persisted separately.

Future identity work should store the base RAID number separately from its label. That migration can later support split identifiers such as `RAID ID 417.1` without changing the visible formatting contract.

This structure is not a commitment to a future backend or database design. Planned business objects and connector boundaries are documented in [Domain Model](DOMAIN_MODEL.md) and [Data Integrations](DATA_INTEGRATIONS.md).
