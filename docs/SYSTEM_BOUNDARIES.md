# System Boundaries

## ShipCommand’s role

ShipCommand is the release operations and relationship layer. It connects authoritative records, supplies a release-centered experience, and derives readiness and progress across the lifecycle.

## Ownership boundaries

| Information | Initial authority | ShipCommand responsibility |
|---|---|---|
| RAID workbook data | Excel workbook | Normalize, display, edit in session, derive release views |
| User stories | VersionOne | Relate to release scope and display normalized delivery state |
| Change records | ServiceNow | Relate to releases and display normalized governance state |
| Test cases/results | ALM | Relate to scope and display normalized test state |
| Documents/source lists | SharePoint | Relate evidence and display normalized metadata |
| Release relationships and rollups | ShipCommand | Own or derive where no authoritative source exists |
| Schedules, notes, planning metadata | Open | Candidate ShipCommand-owned data; validate before persistence |

## In scope

- Release-centered navigation and reporting
- Cross-system identity and relationships
- Normalization and provenance
- Derived progress, readiness, and attention summaries
- Portfolio views across releases and RAID items
- ShipCommand-owned metadata that lacks a suitable system of record

## Out of scope unless explicitly decided

- Replacing VersionOne, ServiceNow, ALM, or SharePoint
- General-purpose project management
- Source-system credential administration in the current POC
- Silent or uncontrolled write-back
- Duplicating source records as independently authoritative copies
- Treating derived metrics as mutable facts

## Read versus write

Read-only integrations are the default. Write-back is a future, source-by-source decision requiring ownership, validation, permissions, auditability, conflict handling, and recovery.

## Current POC boundary

The application is a static browser build with in-memory state and workbook input. It has no authentication, backend, shared persistence, live enterprise integration, or production deployment.

## Unresolved boundaries

- Authority for release definitions and schedules
- Ownership of cross-system links and manual overrides
- Whether approvals are referenced or executed in ShipCommand
- Retention and audit expectations
- Portfolio and organizational boundaries
