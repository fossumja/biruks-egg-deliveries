# Biruk’s Egg Deliveries (PWA)

Offline-first Angular PWA for planning and recording egg deliveries. Designed for iPhone home-screen use and full offline operation once data is imported.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-23
- **Type**: Reference
- **Scope**: project overview, key commands, and documentation entry points
- **Non-goals**: detailed architecture decisions or UX specifications
- **Applies to**: this repository

## Key flows

- Import a CSV of customers and routes from Excel.
- Plan and reorder stops on the **Planner** page, then search or add deliveries as needed.
- Run a live delivery route on the **Run** page (deliver/skip, quantities, donations).
- Complete a run to archive it and reset the route; review past runs or receipts in the Planner.
- Record one-off deliveries and donations from the Planner hidden menu.
- Choose a tax year on Home so totals and the export filename match the year.
- Backup a CSV for record-keeping and taxes; restore from a backup CSV when needed.

## Getting started (development)

Install dependencies:

```bash
npm ci
```

Start the dev server:

```bash
npm start
```

Then open `http://localhost:4200/` in your browser.
The app reloads automatically when you change source files.

## Build & deployment

Production build:

```bash
npm run build -- --configuration production
```

For GitHub Pages deployment (as used today):

```bash
# Build with GitHub Pages base href
npm run build -- --configuration production --base-href="/biruks-egg-deliveries/"

# Publish the built app from the browser subfolder to gh-pages
npx angular-cli-ghpages --dir=dist/egg-delivery-app/browser --branch=gh-pages
```

The live app is served from the `gh-pages` branch and can be installed as a PWA on iOS.

## Testing

Run unit and scenario tests:

```bash
npm test
```

The test suite currently focuses on:

- Storage and CSV import/export behavior.
- Donation and delivery totals (including one-off activity).
- Multi-run usage scenarios (see `docs/testing/usage-scenario-tests.md`).

Test plans and coverage goals are documented in:

- `docs/testing/regression-tests.md`
- `docs/testing/usage-scenario-tests.md`

## Documentation

Documentation structure and entry points live in `index.md` and
`docs/reference/documentation-inventory.md`.
