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

## VersionOne Request Explorer v1

`GET /api/versionone/requests` is a separate read-only path through the same React → Python Local Integration API → controlled PowerShell → VersionOne REST XML architecture. PowerShell fixes the upstream asset at `Data/Request`, selects Name, Number, AssetState, Status.Name, Priority.Name, Owner.Name, and Scope.Name, uses Windows default credentials, and retrieves fixed 100-record pages. The browser cannot control the endpoint, fields, headers, paging, credentials, command, or XML.

Python performs namespace-safe parsing, maps absent XML values to null, and selects stable identity in OID → href → Request Number order. It deduplicates across pages, stops at an empty or partial page, enforces the existing 100-page safety limit, and returns normalized JSON without raw XML. Request retrieval has no release parameter, persistence, background refresh, write-back, or RAID synchronization.

Request is confirmed as the VersionOne asset type used by this explorer. Its relationship to Epic assets is still an investigation question; no relationship field or behavior is assumed.

`Scope.Name` is normalized as nullable `planningLevelName`. The API continues to return all accessible Requests; Active Intake, All Active Requests, Release Assigned Requests, and All Accessible Requests are client-side projections. A release-shaped Planning Level is only a candidate signal for future Request-to-Release investigation and does not currently establish a relationship.

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

`ReleaseStore` is the browser POC’s authoritative owner of normalized Release identity, selected Release, locally known RAID count, and optional integration metadata. Existing RAID and schedule models continue using Release names as compatibility keys. VersionOne, ServiceNow, and future ALM capabilities incrementally populate fields on the shared Release rather than creating independent Release objects. The store is native React session state with no context framework, localStorage, API, or persistence.

Future enterprise integrations attach read-only summaries and drill-down actions to a Release panel. The current VersionOne panel links to the existing Story Explorer without changing its React → Python → PowerShell → VersionOne boundary. ServiceNow and ALM panels are placeholders only. No workspace persistence, synchronization process, or generic connector framework exists.

## ServiceNow connectivity spike

`GET /api/servicenow/test` applies the existing local integration boundary to a read-only ServiceNow feasibility test:

```text
React Diagnostics
        ↓ same-origin JSON
Python Local Integration API
        ↓ fixed controlled subprocess
PowerShell Invoke-WebRequest
        ↓ local approved configuration
ServiceNow
```

The ServiceNow base URL and test path exist only in `SHIPCOMMAND_SERVICENOW_BASE_URL` and `SHIPCOMMAND_SERVICENOW_TEST_PATH` on the local work computer. The browser supplies no parameters and cannot control the URL, path, query, table, headers, credentials, or command. PowerShell uses default Windows credentials for the spike and returns only response classification metadata. Bodies, headers, cookies, redirects, URLs, and credentials are excluded from the React contract.

This endpoint determines whether direct REST, integrated authentication, interactive SSO, OAuth, network restrictions, or another approved mechanism applies. It does not retrieve TSLC data. If direct REST access is unavailable, a future read-only report-export ingestion boundary may replace live REST access; report format, transfer, parsing, and provenance remain undecided.

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
