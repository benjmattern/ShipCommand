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
git add .gitignore demo scripts tests src docs package.json
git commit -m "Refresh work-computer demo build"
git push origin main
```

The script runs `npm run build`, validates `dist/`, stages a complete copy, and safely replaces `demo/`. It removes stale generated assets so `demo/` mirrors the current Vite output. It does not run Git commands automatically. The equivalent convenience command is `npm run demo:build`.

Run the script whenever application code changes before work-computer testing. Node and npm are required only on the personal development computer.

## Work computer

Pull the committed static demo build and serve it:

```text
git pull
python .\scripts\serve-shipcommand.py
```

Open `http://localhost:8000` in a browser. The Python standard-library server locates and serves the committed `demo/` build and exposes same-origin Local Integration API routes. Use Ctrl+C to stop it. A custom port can be supplied with `--port`.

Python is required on the work computer; npm is not. Sign into VersionOne in the browser if needed for normal navigation, but the server diagnostic uses the current Windows user’s default credentials through a controlled PowerShell request rather than forwarding browser cookies. Do not enter a password or token into ShipCommand.

For Story Explorer validation, open VersionOne, load the fixed R29 dataset, and record Story/page counts, duration, status/team/owner behavior, missing fields, and possible duplicates. Exercise number/name search plus status and team filters. Do not copy sensitive Story content into public documentation.

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
