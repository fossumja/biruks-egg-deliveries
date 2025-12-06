# Biruk’s Egg Deliveries (PWA)

Offline‑first Angular PWA for planning and recording egg deliveries.  
Key flows:
- Import a CSV of customers and routes from Excel.
- Plan and reorder stops on the **Planner** page.
- Run a live delivery route on the **Run** page (deliver / skip, quantities, donations).
- Record one‑off deliveries and donations from the Planner hidden menu.
- Export an updated CSV for record‑keeping and taxes.

This app is designed to run as an installable PWA on iPhone and work fully offline once the data is imported.

---

## Getting started (development)

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm start
```

Then open `http://localhost:4200/` in your browser.  
The app reloads automatically when you change source files.

---

## Build & deployment

Production build:

```bash
npx ng build --configuration production
```

For GitHub Pages deployment (as used today):

```bash
# Build with GitHub Pages base href
npx ng build --configuration production --base-href="/biruks-egg-deliveries/"

# Publish the built app from the browser subfolder to gh-pages
npx angular-cli-ghpages --dir=dist/egg-delivery-app/browser --branch=gh-pages
```

The live app is served from the `gh-pages` branch and can be installed as a PWA on iOS.

---

## Testing

Run unit and scenario tests:

```bash
npm test
```

The test suite currently focuses on:
- Storage and CSV import/export behavior.
- Donation and delivery totals (including one‑off activity).
- Multi‑run usage scenarios (see `USAGE-SCENARIO-TESTS.md`).

Test plans and coverage goals are documented in:
- `REGRESSION-TESTS.md`
- `USAGE-SCENARIO-TESTS.md`

---

## Documentation

Design and behavior documentation lives alongside the code:

- **Architecture overview** – high‑level data and PWA design  
  `Architecture Overview.txt`

- **UX & styling** – screen inventory and style system  
  `README-ux.md`  
  `Style Guide.txt`

- **Test strategy** – regression and usage‑scenario plans  
  `REGRESSION-TESTS.md`  
  `USAGE-SCENARIO-TESTS.md`

Task‑oriented notes for ongoing work are in:
- `Task Breakdown.txt`  
- `Task Breakdown - Styling.txt`
