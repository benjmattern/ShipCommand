# System Architecture

## Status legend

- **Implemented:** present in the current POC.
- **Planned:** a likely next or near-term capability.
- **Vision:** architectural direction, not an implementation commitment.
- **Open:** unresolved and requiring validation.

## Current architecture — implemented

ShipCommand is a static React + TypeScript + Vite browser application. It loads RAID data from `BacklogData.xlsx`, normalizes it into in-memory domain records, and derives release summaries, phase rollups, filters, and progress views through pure selectors. `App.tsx` owns mutable session state. There is no backend, authentication, shared database, live API, or enterprise-system write-back.

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

The personal development computer builds `dist/`. The work computer serves those static files using Python `http.server`.

## Direct-browser enterprise diagnostic — under evaluation

The VersionOne feasibility spike currently tests a read-only cross-origin browser path:

```text
ShipCommand static app
http://localhost:8000
        ↓ browser fetch with existing browser credentials
VersionOne REST API
https://versionone.usps.gov
```

Direct navigation to the VersionOne XML endpoint has been verified on the USPS work computer. The in-application diagnostic now evaluates whether JavaScript served from localhost can read that response under VersionOne authentication and browser CORS policy. This path is diagnostic and is not an approved production integration.

No proxy is implemented. If the browser cannot read the response, a local Python adapter remains a possible next feasibility step.

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
