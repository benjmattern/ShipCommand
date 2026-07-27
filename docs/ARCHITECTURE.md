# Architecture

- `App.tsx` owns the single in-memory RAID item array and all CRUD and priority mutations.
- `connectors.ts` parses `BacklogData.xlsx` into the shared `DataRecord` model.
- `releaseSelectors.ts` provides pure derived release-feature and release-summary views.
- `ReleaseTracker.tsx` renders release overview and read-only release detail screens.
- `raid.ts` centralizes RAID ID display formatting.
- `microservices.ts` owns controlled microservice reference data, workbook normalization, and ID-to-name resolution.

No duplicate release-feature state is stored. Release tracker output is recalculated from the current RAID items. Navigation uses local React view state because the POC does not need a routing dependency.

Service assignments currently live on each RAID item as stable microservice IDs. Workbook service strings are normalized during import with case-insensitive exact names and an explicit alias table. Unrecognized source labels are preserved separately and surfaced in the UI rather than guessed or discarded. Release views resolve service names from those same RAID assignments.

A future assignment model will add `microserviceId`, `involvementType`, and `applicablePhaseIds`. Planned involvement types are Full Delivery, Testing Support, Requirements Only, and Custom.

Future identity work should store the base RAID number separately from its label. That migration can later support split identifiers such as `RAID ID 417.1` without changing the visible formatting contract.
