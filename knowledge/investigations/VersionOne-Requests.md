# Investigation: VersionOne Requests

## Status

Request retrieval and the read-only explorer are implemented. Relationships remain under investigation.

## Confirmed asset type

- VersionOne asset type: `Request`
- Fixed REST path: `Data/Request`
- Local API: `GET /api/versionone/requests`
- Paging: 100 records per page, continuing until an empty page, partial page, or 100-page safety limit

## Fields currently retrieved

- `Name`
- `Number`
- `AssetState`
- `Status.Name`
- `Priority.Name`
- `Owner.Name`
- `Scope.Name` (normalized as `planningLevelName`)

Missing source values normalize to null. Stable identity preference is OID, then href, then Request Number. Raw XML remains behind the Local Integration API.

## Explorer boundary

The VersionOne Request Explorer is read-only and session-only. It supports search, dynamic Status/Priority/Owner/Planning Level/Asset State filters, named client-side views, sortable columns, visible/total counts, and Request details. It performs no editing, persistence, write-back, background refresh, or synchronization.

ShipCommand's existing RAID backlog remains a separate first-class feature. Requests are an independent VersionOne source and do not replace or synchronize with RAID in this increment.

## Planning Level findings

- Planning Level is exposed by VersionOne as `Scope.Name`.
- The observed VersionOne Requests Planning page uses Planning Level `MEPT: Package Platform-4724` and Asset State `64`.
- ShipCommand intentionally retrieves all accessible Requests, so a larger All Accessible count is expected and does not indicate missing or duplicate records.
- `MEPT: Package Platform-4724` appears to be the default intake Planning Level.
- Requests planned into a release appear to use values such as `29.0.0.0` or `30.0.0.0`. This is a live observation and a candidate mapping signal, not a confirmed durable relationship key.
- Asset State meanings remain intentionally undefined; the explorer displays raw values such as `64` and `200`.

Active Intake, All Active Requests, Release Assigned Requests, and All Accessible Requests are client-side views over the same complete collection. Active Intake reproduces the observed Planning page predicate and is the default.

## Relationship investigation

The Request-to-Epic relationship is not yet verified. No relationship field is documented as supported, and the explorer does not infer or navigate Requests to Epics, Stories, Releases, or other assets.

### 2026-08-05 discovery attempt

- Candidate tested: `Epic`
- Method: one read-only `Data/Request` query selecting only `Epic`, outside production code
- Result: inconclusive; the request failed with a transport-level `WebException` and no HTTP status or XML response was available
- Conclusion: this does **not** establish that `Epic` is supported or unsupported
- Code impact: none; the candidate was not added to the fixed Request query

Candidate fields for one-at-a-time future testing include `Epic`, `Epics`, `Parent`, `Children`, `Scope`, `PortfolioItem`, and `Super`. Unsupported candidates must not remain in production query code.

## Open questions

- Which field, if any, represents a Request-to-Epic relationship?
- Is a relationship single-valued or multi-valued, and what XML shape does it use?
- Are relationship fields consistently available for Requests in different states?
- Does a Request relate directly to Scope, or only through another asset?

## Next investigation

Test one candidate relationship field against `Data/Request` in an approved environment, beginning with the field indicated by authoritative VersionOne metadata or documentation. Record only sanitized schema observations, never production record data.
