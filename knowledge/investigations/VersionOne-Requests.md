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

Missing source values normalize to null. Stable identity preference is OID, then href, then Request Number. Raw XML remains behind the Local Integration API.

## Explorer boundary

The VersionOne Request Explorer is read-only and session-only. It supports search, dynamic Status/Priority/Owner filters, sortable columns, and Request details. It performs no editing, persistence, write-back, background refresh, or synchronization.

ShipCommand's existing RAID backlog remains a separate first-class feature. Requests are an independent VersionOne source and do not replace or synchronize with RAID in this increment.

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
