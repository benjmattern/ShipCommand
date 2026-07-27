# Architecture

- `App.tsx` owns the single in-memory RAID item array and all CRUD and priority mutations.
- `connectors.ts` parses `BacklogData.xlsx` into the shared `DataRecord` model.
- `releaseSelectors.ts` provides pure derived release-feature and release-summary views.
- `ReleaseTracker.tsx` renders release overview and read-only release detail screens.
- `raid.ts` centralizes RAID ID display formatting.

No duplicate release-feature state is stored. Release tracker output is recalculated from the current RAID items. Navigation uses local React view state because the POC does not need a routing dependency.

Future identity work should store the base RAID number separately from its label. That migration can later support split identifiers such as `RAID ID 417.1` without changing the visible formatting contract.
