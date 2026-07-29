# UI Architecture

## Current structure

The React POC uses local component state and CSS. `App.tsx` owns the RAID array and switches among RAID, Releases, and Diagnostics views without React Router. Modal state supports create, read, update, and delete workflows.

## Views

- **RAID dashboard:** summary metrics, release filter, draggable priority grid, and item modal.
- **Releases overview:** compact, accessible release rows with semantically sorted metrics.
- **Release detail:** Schedule display and editor followed by phase summary, attention summary, phase filter, and derived feature table.
- **RAID modal:** details plus service, involvement, phase applicability, and progress editing.
- **Diagnostics:** Enterprise Connections contains a VersionOne Local Integration API connectivity card.

## State principles

- Mutable RAID state has one owner.
- Mutable Release schedule state is owned by `ReleaseTracker` and initialized from normalized copies of immutable seed fixtures.
- Release and progress UI is derived.
- View, selected release, selected phase, modal, and drag state are local UI concerns.
- No router or state library is justified by current scope.
- Diagnostic status and sanitized result metadata remain session-only in the VersionOne card.

## Enterprise connectivity diagnostics

Diagnostics is a top-level POC navigation view designed to accept additional enterprise connection tests over time. The first card performs a read-only same-origin request to `/api/versionone/test` and displays status, timing, readable upstream HTTP metadata, response size, and format indicators. Its visible path is ShipCommand → Local Integration API → VersionOne.

The local API returns structured sanitized JSON, including a `local-api` request-path marker. VersionOne XML is inspected only by the controlled server-side request and is never returned to React. Diagnostic state remains session-only; the UI does not request credentials or expose enterprise story content.

## Accessibility and responsiveness

Interactive overview rows and phase summaries use native buttons, visible focus states, text labels, and accessible names. Layouts wrap or stack on narrower screens. Color supplements rather than replaces status text.

## Phase progress modes

Phase-progress rendering consults the shared controlled phase definition. Percentage phases retain numeric percent displays and inputs. CAT Ready uses explicit `Ready` or `Not ready` text in RAID detail and Release phase views, and its existing service phase-progress editor replaces the percent input with a labeled, keyboard-accessible checkbox. The numeric compatibility value remains hidden from users.

## Release schedule display

`ReleaseScheduleSection` sits after the Release Detail header and before execution Phase Summary. It uses the normalized schedule lookup, displays the overall window first, and then displays all controlled phases in order. Complete and partial ranges use explicit date text; missing values say `Not scheduled`, and Releases without a schedule use a dedicated empty state.

Date-only values are formatted by a pure helper that reads their year, month, and day components without converting through a timezone. The read-only section does not expose execution indicators.

`ReleaseScheduleEditor` reuses the application modal conventions and owns an isolated normalized draft. Existing schedules prepopulate it; an unscheduled Release receives an empty seven-phase draft. Native date inputs stack responsively without horizontal scrolling. Domain validation messages appear at the Release or phase scope, Save upserts into session state, and Cancel, Escape, backdrop close, or switching Releases discard the draft.

## Direction

Release-centered navigation remains primary. New modules should enter through a Release context where practical, while portfolio views support cross-release reporting. Routing, design systems, and shared application state remain future decisions driven by proven complexity.
