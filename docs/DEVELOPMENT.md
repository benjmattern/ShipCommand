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

To create the committed static build used by the work computer:

```text
git pull
.\scripts\build-demo.ps1
git status
git add demo scripts/build-demo.ps1 package.json docs/DEVELOPMENT.md
git commit -m "Refresh work-computer demo build"
git push origin main
```

The script runs `npm run build`, validates `dist/`, stages a complete copy, and safely replaces `demo/`. It removes stale generated assets so `demo/` mirrors the current Vite output. It does not run Git commands automatically. The equivalent convenience command is `npm run demo:build`.

Run the script whenever application code changes before work-computer testing. Node and npm are required only on the personal development computer.

## Work computer

Pull the committed static demo build and serve it:

```text
git pull
cd demo
python -m http.server 8000
```

Open `http://localhost:8000` in a browser. Serving files over HTTP is required for workbook fetch and Diagnostics behavior; opening `index.html` directly is not the supported workflow. npm is not required on the work computer.

## Validation expectations

- Run `npm run build` after implementation changes.
- Exercise workbook loading and affected CRUD or release flows.
- Validate pure selectors with focused data cases for nontrivial rollups or sorting.
- Preserve the unrelated root `backlog.md`.
- Refresh generated demo artifacts with `scripts/build-demo.ps1` when a work-computer build is requested.

## Current warnings

Vite reports a non-failing bundle-size warning because XLSX is included in the browser bundle. There is no production deployment or optimization target yet.

## Local-first constraints

State is in memory, refresh resets changes, and no secrets or live enterprise credentials belong in the repository. Connector work should begin with safe local fixtures or approved exports.
