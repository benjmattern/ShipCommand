# UI Architecture

## Current structure

The React POC uses local component state and CSS. `App.tsx` owns the RAID array and switches between RAID and Releases views without React Router. Modal state supports create, read, update, and delete workflows.

## Views

- **RAID dashboard:** summary metrics, release filter, draggable priority grid, and item modal.
- **Releases overview:** compact, accessible release rows with semantically sorted metrics.
- **Release detail:** read-only Schedule section followed by phase summary, attention summary, phase filter, and derived feature table.
- **RAID modal:** details plus service, involvement, phase applicability, and progress editing.

## State principles

- Mutable RAID state has one owner.
- Release and progress UI is derived.
- View, selected release, selected phase, modal, and drag state are local UI concerns.
- No router or state library is justified by current scope.

## Accessibility and responsiveness

Interactive overview rows and phase summaries use native buttons, visible focus states, text labels, and accessible names. Layouts wrap or stack on narrower screens. Color supplements rather than replaces status text.

## Release schedule display

`ReleaseScheduleSection` sits after the Release Detail header and before execution Phase Summary. It uses the normalized schedule lookup, displays the overall window first, and then displays all controlled phases in order. Complete and partial ranges use explicit date text; missing values say `Not scheduled`, and Releases without a schedule use a dedicated empty state.

Date-only values are formatted by a pure helper that reads their year, month, and day components without converting through a timezone. The section is read-only and does not expose execution indicators or editing controls.

## Direction

Release-centered navigation remains primary. New modules should enter through a Release context where practical, while portfolio views support cross-release reporting. Routing, design systems, and shared application state remain future decisions driven by proven complexity.
