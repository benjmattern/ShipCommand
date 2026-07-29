# Current Data Model

This document describes the implemented TypeScript POC. For the broader conceptual language, see [Domain Model](DOMAIN_MODEL.md).

## RAID record

`DataRecord` currently contains an internal ID, formatted RAID ID, source key, title, numeric priority, optional release, status, customer/project, service assignments, unknown source-service labels, optional update date, and summary.

The visible RAID label remains compatible with workbook identifiers. Separating the base number from display formatting is deferred.

## Service assignment

```text
microserviceId
involvementTypeId
applicablePhaseIds[]
phaseProgress[]
```

Controlled IDs are validated and deduplicated. Full Delivery is the import default; explicit test-only source labels use Testing Support.

## Phase progress

```text
phaseId
statusId
percentComplete
note?
```

Complete is 100%; Not Started is 0%; Blocked may retain partial progress; Not Applicable is excluded from rollups. Progress exists only for applicable phases.

## Release schedule

Release Planning Slice 1 introduces a separate normalized planning model:

```text
ReleaseSchedule
  releaseId
  plannedStartDate
  plannedEndDate
  phaseSchedules[]

PhaseSchedule
  phaseId
  plannedStartDate
  plannedEndDate
```

Dates are date-only ISO strings (`YYYY-MM-DD`) or `null`; JavaScript `Date` objects are not the stored representation. Phase schedules reuse the seven controlled phase IDs and normalize into controlled display order.

Schedule data answers when work is planned. `phaseProgress` answers how execution is progressing. Schedule dates do not affect status, percentage, blocker counts, readiness, or release rollups.

The current POC temporarily keys schedules by the normalized Release name because no independent Release identity exists yet. Non-authoritative sample schedules are seeded separately from `BacklogData.xlsx`; the workbook schema is unchanged.

## Workbook normalization

`connectors.ts` loads `BacklogData.xlsx` through XLSX. Service strings are split and matched case-insensitively through an explicit alias map. Controlled values become service assignments. Unknown values are preserved separately rather than guessed or discarded.

## Derived projections

- Release features and summaries
- Service, RAID, and release progress
- Release phase rollups
- Attention phases and phase counts
- Semantic descending release order, with `Rx.x.x` first

These projections are recomputed from the in-memory RAID array and are not stored as competing mutable state.

## Persistence

There is none. Browser refresh restores workbook-derived records. The current model is evidence for future design, not a finalized database schema.
