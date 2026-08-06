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
- Local Integration API — VersionOne Connectivity v1: static/API Python server and same-origin sanitized diagnostic endpoint
- VersionOne Story Retrieval v1: R29 paging, XML parsing, normalized Story JSON, and read-only Story Explorer
- VersionOne Defect Story Support: combined Story/Defect retrieval, server-side type classification, counts, Type badges, and filtering
- VersionOne Release Querying v1: user-entered validated release loading, distinct draft/requested/loaded state, loaded-release refresh, and release-specific empty/error behavior
- VersionOne Request Explorer v1: fixed `Data/Request` retrieval, complete paging, normalized Request JSON, independent top-level read-only explorer, filters, sorting, and details
- VersionOne Request Planning Level and Views v1: `Scope.Name` normalization, Planning Level and Asset State controls, Active Intake default, and all-active/release-assigned/all-accessible views
- Application Configuration Layer v1: centralized environment vocabulary, same-origin API resolution, enabled feature flags, and readonly application configuration with no visible behavior change
- Release Workspace Foundation v1: Release-centered workspace, sticky context header, reusable collapsible panels, and preserved Planning and Phase Progress experiences
- ServiceNow Connectivity Spike v1: locally configured read-only diagnostic endpoint, controlled PowerShell request, sanitized authentication/response classification, and Diagnostics card
- Release Identity v1: normalized first-class Release model, lightweight ReleaseStore, Release-backed workspace summaries, and session-only TSLC Project identity editing

Seeded Releases show non-authoritative sample planning dates separately from the RAID workbook. Schedule CRUD is available for the current session; refresh restores seed values. Permanent persistence and planning-warning rules remain open.

CAT Ready readiness is currently user-entered. Derived readiness, deployment verification, and external synchronization remain future work.

VersionOne connectivity through controlled PowerShell default credentials is proven on the USPS work computer. `/api/versionone/stories` and the Story Explorer accept arbitrary validated four-segment releases, with `29.0.0.0` remaining the initial default. Fixed upstream Story and Defect asset requests are merged into one collection. Live validation of at least one additional release and Defect XML conventions remains pending; release discovery, automatic synchronization, RAID matching, and Release Tracker integration remain deferred.

`/api/versionone/requests` independently queries the confirmed VersionOne `Request` asset type with fixed fields: Name, Number, AssetState, Status.Name, Priority.Name, Owner.Name, and Scope.Name. Scope is normalized as Planning Level while Asset State remains uninterpreted. ShipCommand intentionally retains all accessible Requests; the default Active Intake view applies the observed VersionOne Planning page predicate (`MEPT: Package Platform-4724` and Asset State `64`) on the client. Count differences from All Accessible are therefore expected filtering differences.

The Request Explorer is read-only and session-only; it does not replace or synchronize with the first-class RAID backlog. Release-like Planning Levels may later support Request-to-Release investigation, but no mapping is implemented. Request-to-Epic relationships also remain under investigation.

Application configuration is now isolated in plain TypeScript modules. The current environment remains `development`, the API base remains empty, and all existing features remain enabled. GitHub Pages support, environment-specific API routing, localhost API experiments, and enterprise deployment remain future increments.

Release is now the primary UI context. Selecting one from the Releases overview opens its Release Workspace. Overview, Release Planning, and Phase Progress are initially expanded; VersionOne, ServiceNow, ALM, and RAID are compact collapsed panels. ServiceNow, ALM, and Release-level RAID linkage remain placeholders rather than claimed integrations.

ServiceNow connectivity architecture is implemented but not yet classified on the USPS work computer. Missing local configuration is handled safely. No TSLC table lookup, OAuth flow, synchronization, report parsing, or persistence exists. The live result will determine whether direct REST, Windows integrated authentication, another approved authentication mechanism, or report ingestion is appropriate.

Release identity now comes from a shared model derived from locally known RAID assignments. ReleaseStore owns selection and optional metadata for the current browser session. Workspace placeholders read those fields directly. TSLC Project values may be validated and saved locally, but enterprise identifiers, Story/Defect counts, health, refresh timestamps, and ALM mappings remain undefined until authoritative integrations populate them.

## Current operating constraints

- No production backend or durable/shared database
- No authentication or authorization
- No production-grade or scheduled enterprise data integration; VersionOne retrieval remains an explicit local read-only POC
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
