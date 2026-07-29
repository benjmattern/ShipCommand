# Decisions

## Product and platform

- ShipCommand is a Release Operations Platform organized primarily around the Release.
- Portfolio views complement release-centered navigation.
- The product connects a release digital thread without replacing enterprise systems.
- Business object names are source-independent: User Story, Change Record, Test Case, Document, Approval, and Estimate.
- Systems of record remain authoritative; read-only integration precedes write-back.
- ShipCommand may own relationships, planning metadata, notes, schedules, and rollups where no appropriate authority exists.

## Architecture

- Source-specific authentication, queries, schemas, and mappings belong in isolated connectors.
- Core domain and selectors must not depend on enterprise product field shapes.
- Derived release summaries and progress are not duplicated as mutable state.
- Implement small vertical slices and defer speculative enterprise abstractions.
- The current product remains a local static POC with in-memory state and workbook input.

## Current domain behavior

- Release values currently come from `BacklogData.xlsx`.
- Microservices, involvement types, delivery phases, and progress statuses use controlled stable IDs.
- Service assignments are the RAID item source of truth and may change at any point.
- Workbook service strings use exact names and aliases; unknown labels are preserved without fuzzy matching.
- Full Delivery is the import default; explicit test-only aliases use Testing Support.
- CAT Ready and CAT Execution are distinct phases.
- Phase progress is stored at RAID + microservice + phase.
- Complete equals 100%; Not Started equals 0%; Blocked may retain partial progress.
- Not Applicable is excluded from rollups.
- Release phase summaries and filtering derive from service-phase progress.
- Needs Attention initially reports blocked phases without speculative risk scoring.

## Current UI

- Release overview is a compact list.
- `Rx.x.x` sorts first; numeric release segments sort descending.
- Phase filtering is local UI state.
- Release reassignment moves the item for the POC.

## Deferred decisions

- Persistence, identity, authorization, deployment, and operational support
- Connector contract beyond the needs proven by real sources
- Write-back and conflict resolution
- Full release phase matrix
- Phase dates, dependencies, notifications, and history
- RAID splitting, attachments, configurable Settings, and approval execution

See [System Boundaries](SYSTEM_BOUNDARIES.md) and [System Architecture](SYSTEM_ARCHITECTURE.md).
