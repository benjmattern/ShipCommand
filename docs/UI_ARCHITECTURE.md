# UI Architecture

## Current structure

The React POC uses local component state and CSS. `App.tsx` owns the RAID array and switches among RAID, Releases, and Diagnostics views without React Router. Modal state supports create, read, update, and delete workflows.

## Views

- **RAID dashboard:** summary metrics, release filter, draggable priority grid, and item modal.
- **Releases overview:** compact, accessible release rows with semantically sorted metrics.
- **Release Workspace:** sticky Release context plus reusable Overview, VersionOne, ServiceNow, ALM, RAID, Release Planning, and Phase Progress panels.
- **RAID modal:** details plus service, involvement, phase applicability, and progress editing.
- **Diagnostics:** Enterprise Connections contains a VersionOne Local Integration API connectivity card.
- **VersionOne Stories and Defects:** explicit load/refresh, retrieval summary, number/title search, type/status/team filters, and one read-only delivery-record table.

## State principles

- Mutable RAID state has one owner.
- Mutable Release schedule state is owned by `ReleaseTracker` and initialized from normalized copies of immutable seed fixtures.
- Normalized Release identity, selected Release, and optional local integration metadata are owned by the App-level `ReleaseStore`, allowing session metadata to survive navigation between views.
- Release and progress UI is derived.
- View, selected release, selected phase, modal, and drag state are local UI concerns.
- No router or state library is justified by current scope.
- Diagnostic status and sanitized result metadata remain session-only in the VersionOne card.

## Enterprise connectivity diagnostics

Diagnostics is a top-level POC navigation view designed to accept additional enterprise connection tests over time. The first card performs a read-only same-origin request to `/api/versionone/test` and displays status, timing, readable upstream HTTP metadata, response size, and format indicators. Its visible path is ShipCommand → Local Integration API → VersionOne.

The local API returns structured sanitized JSON, including a `local-api` request-path marker. VersionOne XML is inspected only by the controlled server-side request and is never returned to React. Diagnostic state remains session-only; the UI does not request credentials or expose enterprise story content.

The ServiceNow card is a separate, user-triggered connectivity spike using `/api/servicenow/test`. It displays local configuration state, duration, upstream status, content type, response kind, authentication outcome, redirect/login detection, and a sanitized message. It never displays or accepts enterprise URLs, response bodies, headers, cookies, credentials, tables, or queries. ServiceNow and VersionOne diagnostic state remain independent and session-only.

## VersionOne Story Explorer

VersionOne is a top-level view with local page state and no automatic startup load. A labeled release input begins at `29.0.0.0`, validates four numeric segments client-side, and submits only explicit user-triggered loads. Draft input, the in-flight requested release, and the response-backed loaded release remain distinct: editing does not relabel current results, failure preserves prior results, and Refresh reloads the loaded release rather than an unrelated draft.

Successful release changes reset search, Type, status, and team filters, then show release-specific retrieval metadata plus total, Story, Defect, and optional Other counts. The unified table includes a Type badge and Title column. Search covers B-/D- numbers and titles; Type, status, and team filters combine with search, while status and team options derive from the complete returned collection. Loading, sanitized release-specific error/retry, valid empty-release, and no-filter-match states are explicit.

## Release Workspace

Selecting a Release enters the Release Workspace. A compact sticky header retains the Release name, existing RAID-derived progress/counts, and explicit placeholders for data that is not yet available. It does not invent overall health, enterprise counts, or refresh timestamps.

`WorkspacePanel` is the shared accessible disclosure pattern. It accepts title, optional health, summary, actions, default expansion, and arbitrary body content. Overview, Release Planning, and Phase Progress start expanded. VersionOne, ServiceNow, ALM, and RAID start collapsed. Expansion is session-local component state and is not remembered.

Release Planning embeds the existing schedule component and editor unchanged. Phase Progress retains the existing phase cards, attention summary, filters, Boolean/percentage formatting, CAT Ready behavior, and RAID-derived table. VersionOne remains a separate detailed explorer opened from its workspace panel; its state is not duplicated. ServiceNow, ALM, and Release-level RAID linkage are explicit placeholders.

The Workspace header, Overview, VersionOne summary, RAID count, and ALM placeholder read from the selected `Release`. The ServiceNow panel provides a local TSLC Project identity editor with explicit validation and Save actions. Saving updates only `ReleaseStore`; it does not call Diagnostics, ServiceNow, or any local API, and refresh restores record-derived Release metadata.

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
