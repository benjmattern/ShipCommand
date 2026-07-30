# System Architecture

## Status legend

- **Implemented:** present in the current POC.
- **Planned:** a likely next or near-term capability.
- **Vision:** architectural direction, not an implementation commitment.
- **Open:** unresolved and requiring validation.

## Current architecture — implemented

ShipCommand has a static React + TypeScript + Vite browser UI. It loads RAID data from `BacklogData.xlsx`, normalizes it into in-memory domain records, and derives release summaries, phase rollups, filters, and progress views through pure selectors. `App.tsx` owns mutable session state. A dependency-free local Python server now serves the UI and one diagnostic API route; there is no production backend, shared database, normalized live enterprise data, or enterprise-system write-back.

```text
BacklogData.xlsx
       ↓
XLSX connector / normalization
       ↓
In-memory RAID domain state
       ↓
Pure selectors and rollups
       ↓
RAID and Release views
```

The personal development computer builds `dist/`. The work computer runs the Python Local Integration API, which serves the committed `demo/` build.

## Local Integration API — VersionOne Connectivity v1

The direct-browser VersionOne spike failed on the USPS work computer with `TypeError: Failed to fetch` and no readable HTTP response. Direct navigation still returned XML, proving browser-session and network access but not JavaScript cross-origin access.

```text
ShipCommand static app
http://localhost:8000
        ↓ same-origin JSON
ShipCommand Local Integration API
Python standard-library static/API server
        ↓ controlled PowerShell request with Windows default credentials
VersionOne REST API
https://versionone.usps.gov
```

React no longer calls VersionOne directly. `scripts/serve-shipcommand.py` serves the committed static demo and owns `/api/` routes. VersionOne authentication and XML inspection remain server-side; React receives only sanitized diagnostic JSON.

The current endpoint is diagnostic only. This is a local POC boundary, not an approved production-hosting model. ServiceNow and ALM may later use the same boundary, but no generic enterprise connector framework exists yet.

## VersionOne Story Retrieval v1

`GET /api/versionone/stories` retrieves an explicitly selected VersionOne release, defaulting to the initial R29 inspection value when omitted. The server authoritatively validates the optional four-segment numeric Release parameter, requests sequential fixed 100-record pages from the fixed Story and Defect endpoints through controlled PowerShell authentication, and stops on a partial or empty page. The browser cannot supply an upstream URL, asset type, selected fields, where clause, page controls, headers, credentials, or PowerShell text.

Python parses each XML page once, normalizes and deduplicates records by stable ID, and returns JSON only. Raw XML never crosses the React boundary. Retrieval is capped at 100 pages per fixed asset type and remains an explicit, uncached, non-persistent local POC operation.

Likely future architecture, not implemented:

```text
ShipCommand Release
        ↓ configured VersionOne scope
VersionOne Sync
        ↓
Story and Defect records
        ↓ stable external identifiers
Optional RAID linkage
```

## Release Workspace boundary

Release is the application’s central domain object and the Release Workspace is its primary composition boundary. Existing schedule state and derived phase progress remain owned by their established modules; the workspace composes those capabilities through reusable panels rather than duplicating their state or calculations.

Future enterprise integrations attach read-only summaries and drill-down actions to a Release panel. The current VersionOne panel links to the existing Story Explorer without changing its React → Python → PowerShell → VersionOne boundary. ServiceNow and ALM panels are placeholders only. No workspace persistence, synchronization process, or generic connector framework exists.

## Target logical architecture — vision

```text
User Experience
  Release navigation | Portfolio views | Module workflows
                         ↓
Application Services
  Queries | Commands | Validation | Relationship orchestration
                         ↓
Core Domain
  Release | RAID Item | Story | Test Case | CR | Document | Estimate
                         ↓
Connector Boundary
  VersionOne | ServiceNow | ALM | SharePoint | Excel | Future sources
                         ↓
Enterprise Systems of Record
```

Connectors own authentication, transport, querying, source-specific schemas, and normalization. Core domain logic consumes normalized business objects and must not depend on VersionOne, ServiceNow, ALM, or SharePoint field shapes.

## Architectural principles

- Release-centered navigation with portfolio-level complements.
- A traceable release digital thread.
- Business objects independent of source-system product names.
- Enterprise systems remain authoritative for their records.
- Read-only integration before write-back.
- Connector isolation from core domain and UI.
- Derived summaries instead of duplicated mutable release state.
- Incremental vertical slices instead of speculative platform infrastructure.
- Local-first constraints remain valid until a deployment decision is made.

## Likely evolution

1. **Current:** static browser POC and workbook input.
2. **Planned:** additional read-only exports/connectors behind normalized interfaces.
3. **Future:** durable ShipCommand-owned metadata, identity, authorization, and scheduled synchronization.
4. **Vision:** governed write-back only where ownership, controls, and operational need are proven.

## Open architectural questions

- Where will ShipCommand-owned relationships and planning metadata persist?
- What identity and authorization model is required?
- How will cross-system identities, conflicts, and deletions be reconciled?
- What refresh cadence and auditability are required?
- Which fields, if any, should ShipCommand eventually write back?
- What deployment and support model is appropriate?

See [System Boundaries](SYSTEM_BOUNDARIES.md), [Data Integrations](DATA_INTEGRATIONS.md), and [Implementation Architecture](ARCHITECTURE.md).
