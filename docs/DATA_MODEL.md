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

Controlled phase definitions include a `progressMode` of `percentage` or `boolean` alongside the stable ID, label, and order. CAT Ready is the only current Boolean phase; the other six remain percentage-based.

For backward compatibility, CAT Ready retains numeric storage: `0` means Not ready and `100` means Ready. Legacy values below 100 display as Not ready and remain loadable; explicitly editing CAT Ready normalizes the stored value to exactly 0 or 100. Existing numeric rollups are unchanged. Schedule planning reuses the same controlled phase IDs and ordering but remains separate from execution progress.

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

Editable schedule state is initialized from normalized deep copies of the immutable seed collection. Updates use non-mutating normalized upserts and remain in React memory for the current session. Canonical dates remain ISO strings or `null`; empty native date-input strings become `null`. An explicit schedule whose overall and phase dates are all `null` is valid and distinct from a Release with no schedule record.

## Workbook normalization

`connectors.ts` loads `BacklogData.xlsx` through XLSX. Service strings are split and matched case-insensitively through an explicit alias map. Controlled values become service assignments. Unknown values are preserved separately rather than guessed or discarded.

## VersionOne delivery record

The Local Integration API exposes external, read-only Stories and Defects with `id`, nullable `oid`, `href`, `number`, `assetState`, `status`, `releaseName`, and `teamName`, a required string `name`, `ownerNames[]`, and `recordType`. The stable `id` uses the first available VersionOne OID, Href, or Number. Missing scalar values become `null`; Owners become an array.

`recordType` is normalized server-side: numbers beginning with `B-` are `story`, numbers beginning with `D-` are `defect`, and missing or unexpected prefixes are retained as `other`. Classification is case-insensitive while the original Number is preserved.

The response includes Release, total, Story, Defect, and Other counts, total upstream page count, retrieval time, and duration. Records are not persisted and raw XML is excluded.

## Derived projections

- Release features and summaries
- Service, RAID, and release progress
- Release phase rollups
- Attention phases and phase counts
- Semantic descending release order, with `Rx.x.x` first

These projections are recomputed from the in-memory RAID array and are not stored as competing mutable state.

## Persistence

There is none. Browser refresh restores workbook-derived RAID records and seeded Release schedules. The current model is evidence for future design, not a finalized database schema.
