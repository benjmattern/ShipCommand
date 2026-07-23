# Architecture

## Overview
ShipCommand is a local proof-of-concept application that aggregates data from multiple enterprise-style sources into a unified view.

## Proposed layers
- Frontend: React + Vite + TypeScript + Tailwind
- Data layer: connector adapters that normalize each source into a common record type
- Local runtime: simple JSON or file-based sample data for early development

## Initial shape
- App shell renders a source filter and a unified table.
- Connector implementations are now represented through shared modules in src/connectors.ts and src/types.ts.
- Shared types and normalization helpers are centralized for reuse.

## Design principle
Each connector should implement a common interface so the rest of the UI can remain source-agnostic.
