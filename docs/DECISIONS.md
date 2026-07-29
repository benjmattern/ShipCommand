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
- The current product remains a local POC with a static UI, in-memory state, workbook input, and a dependency-free diagnostic Local Integration API.

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
- Release planning dates use date-only ISO strings (`YYYY-MM-DD`) or `null`.
- Release schedules are normalized separately from derived Release summaries and execution progress.
- Schedule dates never alter progress, phase status, blockers, or readiness.
- The POC temporarily uses Release name as the schedule key.
- Schedule seed data is non-authoritative and remains separate from `BacklogData.xlsx`; the workbook schema is unchanged.
- Release Detail shows the overall planned window followed by all seven controlled phase schedules.
- Unscheduled phases remain visible and use explicit `Not scheduled` text; a Release without a schedule uses a dedicated empty state.
- Seeded POC planning dates are identified once at the Schedule section level.
- Date-only schedule values are formatted directly from ISO components without timezone conversion.
- Schedule presentation remains separate from execution progress and indicators.
- Seed schedule fixtures remain immutable; editable schedules initialize as normalized React-state copies.
- Release Schedule editing is session-only, and refresh restores seeded values.
- The editor uses native date inputs; empty input strings normalize to `null`.
- Schedule drafts remain isolated until Save, while Cancel and closing discard changes.
- Structural validation blocks malformed dates and invalid start/end ordering; partial and explicitly empty schedules remain valid.
- Planning changes never alter execution progress, and permanent schedule persistence remains deferred.
- Controlled phase definitions include an explicit `percentage` or `boolean` progress mode.
- CAT Ready is the only current Boolean phase and retains numeric storage for backward compatibility.
- CAT Ready uses 0 for Not ready and 100 for Ready; legacy values below 100 display as Not ready.
- Explicit CAT Ready edits normalize to exactly 0 or 100.
- Existing aggregate calculations remain numeric and unchanged, and planning schedules remain separate from phase execution.
- Additional metric modes are deferred until a concrete use case requires them.
- Enterprise connectivity diagnostics are a permanent ShipCommand capability; VersionOne is the first diagnostic.
- Direct-browser VersionOne access was rejected after the work-computer test returned `TypeError: Failed to fetch` with no readable response.
- Direct browser navigation returning XML proved network and browser-session access, not JavaScript cross-origin access.
- ShipCommand uses a Local Integration API boundary implemented with Python standard-library components for the work-computer POC.
- Windows default credentials are tested through a fixed, controlled PowerShell request.
- React receives sanitized JSON only; XML, credentials, and enterprise authentication remain outside React.
- No third-party Python packages or PowerShell modules are introduced.
- A generic connector framework is deferred until real integrations establish shared requirements.
- R29.0.0.0 is the active VersionOne inspection dataset.
- PowerShell owns authenticated retrieval; Python parses XML and React receives normalized JSON only.
- Paging uses a fixed size of 100, a 100-page safety cap, and strict numeric Release validation.
- Raw XML is neither persisted nor returned to React.
- The read-only Story Explorer precedes Story-to-RAID, Story-to-Feature, and Release mapping work.
- VersionOne `Story` and `Defect` assets are retrieved through fixed server-controlled requests and returned as one normalized collection.
- Record classification occurs in Python: `B-` is Story, `D-` is Defect, and unexpected or missing prefixes remain visible as Other rather than being discarded.
- A future Release Catalog, release synchronization, and stable RAID governance identifier are documented directions; the governance field or tag mechanism remains undecided.

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
- Durable schedule persistence, boundary and overlap warnings, dependencies, notifications, and history
- RAID splitting, attachments, configurable Settings, and approval execution

See [System Boundaries](SYSTEM_BOUNDARIES.md) and [System Architecture](SYSTEM_ARCHITECTURE.md).
