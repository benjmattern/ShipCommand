# Project Status

## Product direction

ShipCommand is the foundation of a Release Operations Platform and unified release digital thread. That statement is direction, not a claim that the full platform exists.

## Implemented POC

- React, TypeScript, Vite, and static local build
- Python `http.server` workflow on the work computer
- Browser loading of approximately 735 RAID items from `BacklogData.xlsx`
- In-memory RAID CRUD, release assignment, release filtering, numeric priority editing, and drag reordering
- Derived release overview and release detail
- Semantic descending release sort with `Rx.x.x` first
- Compact accessible release list
- Controlled microservices and stable IDs
- Service involvement types: Full Delivery, Testing Support, Requirements Only, Custom
- Seven controlled phases, with CAT Ready and CAT Execution separate
- Per-service, per-phase status, percentage, and optional note
- Progress statuses: Not Started, In Progress, Blocked, Complete, Not Applicable
- Derived service, RAID, release, and phase rollups
- Release phase summaries, blocked-phase attention, and phase filtering
- Preservation of unknown workbook service labels

## Current operating constraints

- No backend or durable/shared database
- No authentication or authorization
- No live enterprise API integration
- No scheduled synchronization
- No enterprise-system write-back
- No production hosting or support model
- Refresh resets session changes to workbook data
- XLSX is bundled in the browser and causes a non-failing Vite chunk-size warning

## Planned capability areas

- User stories from VersionOne
- Change records from ServiceNow
- Test cases and results from ALM
- Documents and approval evidence from SharePoint
- Release schedules, milestones, and dependencies
- Governance and documentation approvals
- Financial estimates and funding context
- Portfolio reporting across releases

These capabilities are not implemented.

## Long-term vision

ShipCommand connects planning, execution, testing, governance, financial management, documentation, change, deployment, and retrospective reporting without replacing authoritative enterprise systems.

## Open questions

- Deployment, persistence, identity, and authorization architecture
- Ownership of release definitions, schedules, and cross-system relationships
- Source access methods and refresh cadence
- Conflict, deletion, provenance, and audit handling
- Whether any source-specific write-back is justified

See [Product Vision](PRODUCT_VISION.md), [System Architecture](SYSTEM_ARCHITECTURE.md), and [Backlog](BACKLOG.md).
