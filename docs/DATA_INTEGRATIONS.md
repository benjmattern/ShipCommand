# Data Integrations

## Integration strategy

ShipCommand initially reads, normalizes, and relates authoritative enterprise data. Read-only integration precedes write-back. A connector isolates credentials, transport, queries, pagination, source schemas, and mappings from the core domain.

## Source roadmap

| Source | Domain objects | Authority | Current status |
|---|---|---|---|
| Excel / `BacklogData.xlsx` | RAID items, releases, source service labels | Workbook | Implemented browser loading |
| VersionOne | User stories and delivery state | VersionOne | Planned |
| ServiceNow | Change records and production-change state | ServiceNow | Planned |
| ALM | Test cases, plans, execution, and results | ALM | Planned |
| SharePoint | Documents, lists, approval-related evidence | SharePoint | Planned |
| Other exports/systems | As validated | Source-dependent | Vision |

The presence of connector labels or prototypes does not mean a live integration exists.

## Connector responsibilities

- Authenticate using source-appropriate mechanisms.
- Query and page through source data.
- Map source fields into normalized domain records.
- Preserve source identifiers, timestamps, and provenance.
- Report mapping failures and unknown values.
- Avoid embedding source-specific types in selectors or UI components.

## Conceptual connector contract

```text
fetch source records
    ↓
validate source payload
    ↓
normalize to ShipCommand domain objects
    ↓
retain source reference and diagnostics
    ↓
merge or relate without duplicating derived state
```

The exact TypeScript interface is intentionally deferred until the second real source validates the common abstraction.

## Synchronization principles

- Systems of record remain authoritative for their data.
- ShipCommand may own relationships, schedules, notes, rollups, and metadata lacking an appropriate source.
- Refresh and conflict behavior must be explicit.
- Deletions and stale records require traceable handling.
- Write-back requires a separate decision, permissions model, audit trail, and failure strategy.

## Current limitations

There are no live APIs, credentials, scheduled jobs, background synchronization, shared cache, or write-back. Workbook loading happens in the browser and resets on refresh.

## Open questions

- Export versus API access for each enterprise system
- Authentication constraints on the work network
- Incremental versus full refresh
- Source record matching and conflict resolution
- Data classification, retention, and audit requirements
