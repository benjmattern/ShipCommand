# Release Tracking

## Implemented

- Nonblank workbook release values produce release summaries.
- Release overview uses a compact list.
- `Rx.x.x` sorts first; numeric releases sort by descending numeric segments.
- Overview metrics include progress, assigned features, completed/remaining items, and phase counts.
- Release detail lists assigned RAID items and service information.
- Seven ordered phase summaries derive from service-phase progress.
- Blocked phases appear in a Needs Attention summary.
- Selecting a phase filters release rows and shows per-RAID phase progress.
- Editing RAID release, service, phase, or progress information updates release views immediately.
- Release Detail includes a read-only Schedule section with the overall Release window and all seven phase date ranges.
- Complete, partial, and unscheduled Release schedules have explicit display states.
- Release managers can create, edit, clear, save, or cancel overall and phase planning dates for the current session.

## Rollup behavior

Not Applicable entries are excluded. Blocked takes precedence, Complete requires all counted entries to be complete, In Progress reflects started work, and empty counted work returns N/A. Release progress excludes RAID items without countable progress.

## Controlled phases

Requirements Gathering and Writing; DEV / Unit Testing; SIT; E2E; Regression; CAT Ready; CAT Execution.

## Current limitations

- Release identity is a normalized workbook string rather than a persisted aggregate.
- No durable schedule persistence, dependencies, history, notifications, or full phase matrix.
- No shared state or source-system synchronization.
- Completion counts use existing RAID status values conservatively.

## Schedule planning

The data model supports optional Release and per-phase planned start/end dates. Release Detail displays complete and partial schedules, keeps every controlled phase visible, and shows an explicit empty state when no schedule exists. Seeded dates are labeled as sample planning data until that Release is saved.

The editor uses native date fields for the overall Release window and all seven phases. Save applies a structurally valid draft, Cancel and closing discard it, and Clear Schedule requires confirmation before clearing the draft. Partial and explicitly empty schedules remain valid.

Schedule changes exist in memory for the current browser session; refresh restores immutable seed values. Schedule data does not affect execution progress, phase status, blockers, or readiness. Permanent persistence, Release-boundary warnings, overlap warnings, and chronological warnings remain future work.

## Direction

Release tracking should become the navigation spine connecting stories, tests, CRs, documents, approvals, estimates, schedules, and reporting. See [Product Vision](PRODUCT_VISION.md).
