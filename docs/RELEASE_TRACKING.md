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

## Rollup behavior

Not Applicable entries are excluded. Blocked takes precedence, Complete requires all counted entries to be complete, In Progress reflects started work, and empty counted work returns N/A. Release progress excludes RAID items without countable progress.

## Controlled phases

Requirements Gathering and Writing; DEV / Unit Testing; SIT; E2E; Regression; CAT Ready; CAT Execution.

## Current limitations

- Release identity is a normalized workbook string rather than a persisted aggregate.
- No schedule UI, schedule CRUD, dependencies, history, notifications, or full phase matrix.
- No shared state or source-system synchronization.
- Completion counts use existing RAID status values conservatively.

## Planned schedule foundation

The data model now supports optional Release and per-phase planned start/end dates. Schedule data is currently non-authoritative POC seed data, is not displayed, and does not affect execution progress or readiness. Read-only schedule display and CRUD are future slices.

## Direction

Release tracking should become the navigation spine connecting stories, tests, CRs, documents, approvals, estimates, schedules, and reporting. See [Product Vision](PRODUCT_VISION.md).
