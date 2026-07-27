# Architecture

- `App.tsx` owns the single in-memory RAID item array and all CRUD and priority mutations.
- `connectors.ts` parses `BacklogData.xlsx` into the shared `DataRecord` model.
- `releaseSelectors.ts` provides pure derived release-feature and release-summary views.
- `ReleaseTracker.tsx` renders release overview and read-only release detail screens.
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

`phaseProgress` remains nested within each service assignment. The smallest progress unit is RAID item + microservice + applicable phase. Reconciliation preserves overlapping phases, creates missing defaults, and removes non-applicable or duplicate entries.

`releasePhaseSelectors.ts` derives ordered release phase summaries and per-RAID phase rollups from service-phase progress. Not Applicable entries are excluded. Phase-filter selection is local component state; no release phase data is persisted separately.

Future identity work should store the base RAID number separately from its label. That migration can later support split identifiers such as `RAID ID 417.1` without changing the visible formatting contract.
