# Architecture

## Overview
ShipCommand is a local proof-of-concept application that aggregates data from multiple enterprise-style sources into a unified view.

## Current architecture assumptions
- Frontend: React + Vite + TypeScript + Tailwind
- Data layer: connector adapters that normalize each source into a common record type
- Local runtime: file-based sample data, Excel imports, and exported data for early development
- Backend: intentionally undefined for now; the project will stay local-first until the environment and data sources are clearer

## Development constraints
- There is no public-facing frontend planned at this time.
- All code and data will remain local until further notice.
- The database structure should stay flexible and not be committed to prematurely.
- Live API or other data connections may be implemented locally, but validation will happen on a separate work laptop when required.

## Initial shape
- App shell renders a source filter and a unified table.
- Connector implementations are now represented through shared modules in src/connectors.ts and src/types.ts.
- Shared types and normalization helpers are centralized for reuse.

## Design principle
Each connector should implement a common interface so the rest of the UI can remain source-agnostic.
