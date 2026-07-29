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

## Local workflow

1. Install dependencies with `npm install`
2. Start the app with `npm run dev`
3. Build the project with `npm run build`
