# Development

## Technology

- React 18
- TypeScript
- Vite
- CSS / Tailwind processing
- XLSX browser parsing

## Personal development computer

```text
npm install
npm run dev
npm run build
```

`npm run build` runs TypeScript compilation and produces the static `dist/` directory.

## Work computer

Transfer the built static files and serve them from the build directory:

```text
python -m http.server 8000
```

Open the local server URL in a browser. Serving files over HTTP is required for workbook fetch behavior; opening `index.html` directly is not the supported workflow.

## Validation expectations

- Run `npm run build` after implementation changes.
- Exercise workbook loading and affected CRUD or release flows.
- Validate pure selectors with focused data cases for nontrivial rollups or sorting.
- Preserve the unrelated root `backlog.md`.
- Do not update generated demo artifacts unless explicitly requested.

## Current warnings

Vite reports a non-failing bundle-size warning because XLSX is included in the browser bundle. There is no production deployment or optimization target yet.

## Local-first constraints

State is in memory, refresh resets changes, and no secrets or live enterprise credentials belong in the repository. Connector work should begin with safe local fixtures or approved exports.
