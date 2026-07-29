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
- Release Planning Slice 1: normalized Release and phase schedule types, seed data, lookup/normalization helpers, and structural validation
- Release Planning Slice 2: read-only overall and ordered phase schedule display in Release Detail, including partial and empty states
- Release Planning Slice 3: session-only schedule create, edit, save, cancel, clear, and structural validation UI
- Phase Progress Modes: CAT Ready Boolean display and editing with numeric 0/100 compatibility and unchanged aggregate calculations

Seeded Releases show non-authoritative sample planning dates separately from the RAID workbook. Schedule CRUD is available for the current session; refresh restores seed values. Permanent persistence and planning-warning rules remain open.

CAT Ready readiness is currently user-entered. Derived readiness, deployment verification, and external synchronization remain future work.

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
- Persistent schedule storage, planning warnings, milestones, and dependencies
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
