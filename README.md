# ShipCommand

ShipCommand is the foundation of a Release Operations Platform that connects planning, execution, testing, governance, financial estimates, documentation approvals, and enterprise source-system data into a unified release digital thread.

The current implementation is a local React + TypeScript + Vite proof of concept. It is not a production platform and does not yet include a backend, authentication, live enterprise APIs, shared persistence, or write-back.

See the [documentation index](docs/README.md) for the product vision, architecture, domain model, current status, and roadmap.

## Current development scope

- Local development and testing only
- No public-facing frontend at this time
- All code and data remain local until further notice
- Backend database structure is intentionally flexible and should not be finalized yet
- External API or data connections will be implemented locally, but validated on a work laptop when needed
- Excel files and exported data will be used to simulate source data during development

## Integrated demo modules

- RAID backlog and release workspaces
- VersionOne Stories and Requests views
- Quick ROM entry, session table, and Excel export
- Schedule (integrated from ShipNav), including release CRUD, open/closed status, schedule validation, interactive Gantt editing, duplication, undo, JSON backup/import, CSV export, and printing

Schedule data is stored in browser `localStorage` for the demo. Release schedule edits made from the Release workspace use the same persisted Schedule records.

## Local workflow

1. Install dependencies with `npm install`
2. Start the app with `npm run dev`
3. Build the project with `npm run build`

To refresh the committed work-computer demo on Windows, run `./scripts/build-demo.ps1`, commit the updated `demo/` folder, and then use `python .\scripts\serve-shipcommand.py` after pulling on the work computer.
