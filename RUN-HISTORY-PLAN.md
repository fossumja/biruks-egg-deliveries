# Multi‑Run History & Run Completion – Implementation Plan

This document describes how to evolve Biruk’s Egg Deliveries from a “single live run per route” model into a multi‑run, history‑aware system that:

- Keeps every run’s results (deliver/skip, dozens, donations, taxable) in‑app.
- Lets you clearly mark a run as “completed” and reset the route for next time.
- Lets you browse past runs for a schedule (e.g., Week A runs over the year).
- Keeps CSV imports/exports and totals consistent and additive.

It’s written as a TODO roadmap we can implement incrementally.

---

## 1. Current Behavior Summary (Baseline)

**Data**

- `Delivery` (`src/app/models/delivery.model.ts`)
  - One row per stop in the current dataset.
  - Fields include `routeDate`, `baseRowId`, `dozens`, `status`, `donation`, `oneOffDonations`, `oneOffDeliveries`, etc.
- `StorageService` (`src/app/services/storage.service.ts`)
  - `importDeliveries` clears `deliveries` and `routes` and bulk inserts the new file.
  - `markDelivered` / `markSkipped` update the `Delivery` row immediately (status, timestamps, donation).
  - `updateDonation`, `updatePlannedDozens`, `updateDraftDelivered` adjust state per stop.
  - `resetDelivery` and `resetRoute` clear run status and restore original dozens/donation.
  - Dexie tables: `deliveries`, `routes`, `runs`, `baseStops`, `importStates`.

**Run page (`DeliveryRunComponent`)**

- Operates on `StorageService.getDeliveriesByRoute(routeDate)`.
- As you Deliver/Skip, each stop’s `Delivery` record is updated in Dexie.
- When there are no more pending/changed stops, `finished = true` and a simple completion UI is shown.
- **End run early** (new) marks remaining stops as skipped, then sets `finished = true`.
- No concept of “archived run”; live `deliveries` are the only record.

**Planner (`RoutePlannerComponent`)**

- Always shows the **current live state** of the selected route:
  - Status pills (Pending/Delivered/Skipped/Changed/Unsubscribed).
  - Dozen quantity and hidden menu actions.
- **Reset** (individual) calls `resetDelivery(id)`.
- **Reset route** calls `resetRoute(routeDate)`.

**Export (`BackupService`)**

- `exportAll`:
  - Pulls all current `deliveries` and the saved `importState`.
  - Writes either:
    - A basic CSV (`toCsv`), or
    - A CSV that preserves original headers and appends per‑run state + totals (`toCsvWithImportState`).
  - Totals per `baseRowId` (`computeTotalsByBase`) include:
    - Current run deliveries (status `delivered`).
    - One‑off donations/deliveries (hidden menu).
  - **Does not** yet have a separate “run history” table.

**Implications**

- Everything is saved as you go and survives until:
  - You import a new CSV, or
  - You reset individuals / routes.
- There is no explicit “this run is archived and route is reset” step.
- There is no in‑app way to browse runs over time; only current state + exported CSVs.

---

## 2. Goals for Multi‑Run History

We want:

1. **Per‑run history in Dexie**, not just in exported CSVs.
2. A clear **Complete Run** action that:
   - Locks in the run’s results to history.
   - Resets the current route to a clean, Pending state for future runs.
3. A **Run selector** on the Planner to switch between:
   - Current (live/editable) state.
   - Past runs (read‑only snapshots).
4. **Totals and export** that combine:
   - Baseline totals from imported CSVs (if present).
   - All completed runs stored in history.
   - Any current run that hasn’t been completed yet.
5. Behavior that still works if the user:
   - Runs multiple times without exporting immediately.
   - Imports new CSVs that already contain totals columns.

---

## 3. Data Model Changes

### 3.1. Add Run Snapshot Metadata

We already have a `DeliveryRun` model and a `runs` table. We can either extend that or add a new model. For clarity, we’ll define a dedicated snapshot model (we can choose to reuse `runs` or add `runSnapshots` as a new table).

**TODO:**

- [x] Extend `DeliveryRun` or define a new `RunSnapshot` to represent a completed run:

  ```ts
  // Option A: extend DeliveryRun
  export interface DeliveryRun {
    id: string;          // e.g. "2025-11-25_WeekA_001"
    date: string;        // ISO date the run was completed
    weekType: string;    // "WeekA", "WeekB", etc. (scheduleId)
    label: string;       // e.g. "Week A – 2025-11-25 (Run 3)"
    note?: string;

    status: 'completed' | 'endedEarly';
    routeDate: string;   // original routeDate (Schedule / Date column)
  }
  ```

- [ ] Decide whether to repurpose the existing `runs` table:
  - If `runs` is unused elsewhere, we can migrate it to the extended `DeliveryRun`.
  - Otherwise, add a new table `runSnapshots` with a similar structure.

### 3.2. Add Per‑Stop Run Entries

We need a second table to store per‑person results for each run.

**TODO:**

- [x] Add a `RunSnapshotEntry` interface:

  ```ts
  export interface RunSnapshotEntry {
    id: string;
    runId: string;             // FK to DeliveryRun

    baseRowId: string;         // stable, from CSV
    name: string;
    address: string;
    city: string;
    state: string;
    zip?: string;

    status: 'delivered' | 'skipped';
    dozens: number;            // delivered dozens for this run

    donationStatus: DonationStatus;
    donationMethod?: DonationMethod;
    donationAmount: number;
    taxableAmount: number;
  }
  ```

- [ ] Add a Dexie table in `AppDB`:

  ```ts
  runEntries!: Table<RunSnapshotEntry, string>;
  ```

### 3.3. Dexie Version & Migration

**TODO:**

- [x] Introduce `this.version(4)` in `AppDB` with:

  ```ts
  this.version(4).stores({
    deliveries: 'id, runId, baseRowId, routeDate, status, sortIndex',
    routes: 'routeDate',
    runs: 'id',
    baseStops: 'baseRowId',
    importStates: 'id',
    runEntries: 'id, runId, baseRowId'
  });
  ```

- [ ] Migration strategy:
  - Existing `deliveries` and `routes` should be left as‑is.
  - `runEntries` starts empty; first time we complete a run, we populate it.
  - Optionally: create a synthetic `DeliveryRun` entry for any existing completed route (if `routes.completed` is true and all statuses are delivered/skipped). This is nice‑to‑have but not required.

---

## 4. Storage API Changes

### 4.1. Snapshot & Reset: `completeRun`

Introduce a high‑level operation in `StorageService` that both snapshots and resets a run.

**TODO:**

- [x] Add `completeRun(routeDate: string, endedEarly: boolean): Promise<void>` to `StorageService`.
- [x] Implementation sketch:

  1. Fetch deliveries for the given `routeDate`:
     ```ts
     const stops = await this.getDeliveriesByRoute(routeDate);
     ```
  2. Verify there are no pending/changed stops:
     - If any `status === '' || status === 'changed'`:
       - If `endedEarly` is false → throw an error (UI tells user to finish or end early).
       - If `endedEarly` is true → they should already have been marked skipped by the Run page; treat as error if still pending.
  3. Create a `DeliveryRun` snapshot:
     ```ts
     const now = new Date().toISOString();
     const scheduleId = normalizeSchedule(routeDate); // e.g., "WeekA"
     const runId = /* generate id from date + schedule */;

     const snapshot: DeliveryRun = {
       id: runId,
       date: now,
       weekType: scheduleId,
       label: `${routeDate} – ${now.slice(0, 10)}`,
       status: endedEarly ? 'endedEarly' : 'completed',
       routeDate
     };
     await this.db.runs.put(snapshot);
     ```
  4. For each `Delivery` row with `status === 'delivered' | 'skipped'`, create a `RunSnapshotEntry`:
     - Use the existing totals logic (`computeTotalsByBase`) as a guide for donation and taxable calculation.
     - Record:
       - `baseRowId`
       - `dozens` (deliveredDozens or dozens)
       - `status`
       - `donationStatus`, `donationMethod`, `donationAmount`, `taxableAmount`
  5. Once all entries are written:
     - Call `resetRoute(routeDate)` to clear live state for this schedule.
     - Update `routes.completed` to `false` (because live state is now pending again).

### 4.2. Querying Run History

**TODO:**

- [x] Add helper methods to `StorageService`:

  ```ts
  getRunsForSchedule(scheduleId: string): Promise<DeliveryRun[]>;
  getRunEntries(runId: string): Promise<RunSnapshotEntry[]>;
  ```

- [ ] `scheduleId` should be derived consistently from the CSV’s Schedule/Date column (already used for `week` / `weekType`).

---

## 5. Planner UI: Schedule + Run Selector

### 5.1. Replace “Reset route” Button with Run Selector

In `route-planner.component.html`, the header currently has:

- Schedule dropdown.
- Reset route icon.
- Add delivery.
- Search.

We will:

**TODO:**

- [x] Remove the **Reset route** button from the main header (functionality preserved for future advanced use).
- [x] Add a **Run selector** next to the Schedule dropdown when a single schedule (not All Schedules) is selected:

  - Options:
    - `Current (live)` (default)
    - One entry for each `DeliveryRun` from `getRunsForSchedule(scheduleId)`, e.g.:
      - `Run – 2025‑01‑15`
      - `Run – 2025‑01‑08 (ended early)`

### 5.2. Rendering Current vs Archived Runs

**TODO:**

- [x] When **Current (live)** is selected:
  - Keep existing behavior: map over `deliveries` and show the interactive cards (hidden menu, donation, drag‑to‑reorder when enabled, edit, etc.).

- [x] When an **archived run** is selected:
  - Fetch `runEntries` for that `runId`.
  - Render a read‑only view:
    - Show name/address/status/dozens/donation summary.
    - No hidden menu.
    - No edit/donation/reset buttons.
    - No drag handles.
  - (Optional, still TODO) Include a small note in the header: e.g. “Viewing: Run – 2025‑01‑15 (completed)”.
  - (Optional, still TODO) Add a “Export this run…” button that exports only those entries.

---

## 6. Run Page: Completing a Run

### 6.1. Completion UI

When `DeliveryRunComponent` sets `finished = true` (either naturally or after End‑Run‑Early), we currently show:

- “Backup now” button.
- “Done” button.

**TODO:**

- [x] Add a **Complete run** button to the finished state:

  - Label: `Complete run`.
  - On click:
    - If there are still pending/changed stops → show error (“There are still pending stops; deliver/skip or use End run early first.”).
    - Otherwise, show a confirm dialog:
      - Text: explains that this will archive the run, reset the route, and preserve history.
      - Layout: large **Cancel** button, smaller **Complete** button to make it harder to tap accidentally.
    - On confirm:
      - Call `storage.completeRun(routeDate, endedEarlyFlag)`.
      - On success:
        - Flip `finished = true` (already).
        - Optionally, update the header progress to show 100% with “Run archived”.
        - Show `toast.show('Run archived and route reset for next time')`.
      - Disable the button or change its text to “Run completed” to prevent double‑use.

### 6.2. End Run Early Integration

**TODO:**

- [x] Ensure the **End run early** button:
  - Marks all remaining stops as skipped.
  - Leaves `finished = true`.
  - Sets `endedEarlyFlag = true` so `completeRun` can set the snapshot status accordingly.

---

## 7. Totals & Export Updates

### 7.1. Combine History + Live + Baseline

Current totals from `BackupService.computeTotalsByBase` only consider:

- Live `deliveries` (current run).
- One‑off donations/deliveries.

**TODO:**

- [x] Extend `computeTotalsByBase` (or a new helper) to:

  1. Start from **baseline totals** from the import CSV (if columns like `TotalDonation`, `TotalDozens`, `TotalTaxableDonation` exist).
     - We already preserve these columns in `importState`.
     - Treat them as a starting point per `baseRowId`.

  2. Add contributions from all **RunSnapshotEntry** rows:
     - For each entry, add `dozens`, `donationAmount`, `taxableAmount` into that `baseRowId`’s running total.

  3. Add contributions from the **current live state** in `deliveries`:
     - For any stop with `status === 'delivered'`, add its dozens/donation to totals.
     - Include one‑off donations/deliveries as today.

- [x] Update `toCsv` and `toCsvWithImportState` to use this combined totals map:
  - `TotalDonation`, `TotalDozens`, `TotalTaxableDonation` become true lifetime totals (imported baseline + all runs + one‑offs).

### 7.2. Optional: “Run History CSV”

**TODO (optional):**

- [ ] Add a separate export method in `BackupService`:

  ```ts
  exportRunHistory(): Promise<void>;
  ```

  - Produces a CSV with one row per `RunSnapshotEntry`:
    - `RunDate`, `Schedule`, `BaseRowId`, `Name`, `Dozens`, `Status`, `DonationStatus`, `DonationMethod`, `DonationAmount`, `TaxableAmount`.
  - Useful for deeper tax/analysis workflows if desired later.

---

## 8. Backwards Compatibility & Migration Notes

**TODO:**

- [ ] Migration path for existing users:
  - On upgrade to Dexie version 4:
    - Existing `deliveries` and `routes` are preserved.
    - `runs`/`runEntries` start empty.
    - First time you “Complete run”, new snapshots are created; older runs (recorded before this feature) remain only in live state until you reset/import.
  - Existing exports continue working, but totals become richer once history is used.

- [ ] Ensure `importDeliveries`:
  - Does **not** clear the new run history tables.
  - Only clears `deliveries` and `routes` as it currently does.
  - Keeps `runSnapshots` + `runEntries` so you don’t lose past runs when changing the live dataset (you’ll just no longer be able to correlate new live stops with old runs if `BaseRowId` changes).

---

## 9. Testing Plan

**TODO:**

- [ ] Extend usage scenario tests (`USAGE-SCENARIO-TESTS.md` and specs) to cover:
  - Completing a run snapshots entries and resets live route.
  - Multiple runs for the same schedule generate multiple snapshots and entries.
  - Totals per `baseRowId` combine:
    - Imported baseline totals.
    - All completed runs.
    - Current live run (if any).
- [ ] Unit tests for:
  - `StorageService.completeRun`:
    - Normal completion.
    - End‑run‑early completion.
    - Guard rails when pending/changed stops exist.
  - `getRunsForSchedule` / `getRunEntries`.
  - Totals computation including history.
- [ ] Component tests for:
  - Planner run selector:
    - Switching between Current and archived runs.
    - Archived runs render read‑only.
  - Run page:
    - Complete run button flow (confirm, snapshot, reset).

---

This plan keeps your current incremental save model (per stop) and adds a clear, safe way to:

- Archive each run as an immutable history snapshot.
- Reset the route for the next run.
- Accumulate totals in the app over many runs and only export when you want to. 
