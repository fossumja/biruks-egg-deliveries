# Backup & Restore – Run History Round‑Trip Plan

> Goal: Be able to export a single CSV that contains both the current delivery data and detailed run history, and later restore the app state (deliveries + runs + totals) from that CSV without duplicating history.

---

## 1. High‑Level Design

- Keep **two distinct flows**:
  - **Import CSV (new data)** – what we do today:
    - Replaces the current deliveries/routes with the file’s rows.
    - Uses the file’s totals as a baseline.
    - Leaves existing run history alone.
  - **Restore backup (full restore)** – new:
    - Clears deliveries, routes, run history, and import state.
    - Rebuilds all of them from an exported backup CSV.

- Extend the CSV format so it can represent:
  - Per‑person base data (existing Delivery rows).
  - Per‑run per‑person snapshots (new RunEntry rows).

- Ensure that:
  - Normal **Import CSV** cannot accidentally duplicate or overwrite run history stored in Dexie.
  - **Restore backup** uses the CSV as the source of truth and does a clean replace.

---

## 2. CSV Format Changes

### 2.1. Add a `RowType` column

**TODO:**

- [ ] Add a `RowType` column to the CSV schema:
  - `"Delivery"` – main per‑person row (current behavior).
  - `"RunEntry"` – per‑run snapshot row (new).
  - (Optional future) `"Meta"` – for versioning / migration notes.

**Notes:**

- For **backwards compatibility**, we should treat rows **without** `RowType` as `"Delivery"` when importing old files.

### 2.2. Delivery rows (`RowType = "Delivery"`)

We keep the existing columns, and only add `RowType`:

- `RowType` – `"Delivery"`.
- `Date` – route date / schedule label (e.g. `Week A`, `2025-01-01`).
- `Delivery Order`.
- `Name`, `Address`, `City`, `State`, `ZIP`.
- `Dozens`.
- `Notes`.
- `Status`, `DeliveredAt`, `SkippedAt`, `SkippedReason`.
- `DonationStatus`, `DonationMethod`, `DonationAmount`.
- `TotalDonation`, `TotalDozens`, `TotalTaxableDonation`.

**TODO:**

- [ ] Update `BackupService.toCsv` and `toCsvWithImportState` to prepend `RowType="Delivery"` on each row.
- [ ] Keep the column ordering as close to current as possible to avoid confusing existing spreadsheets.

### 2.3. Run history rows (`RowType = "RunEntry"`)

We introduce a second logical row type to carry `RunSnapshotEntry` data.

**Proposed columns:**

- `RowType` – `"RunEntry"`.
- `RunId` – internal ID (we already use this in Dexie, e.g. `Week A_2025-01-15T12:34:56.789Z`).
- `RouteDate` – schedule label for this run (e.g., `Week A`).
- `ScheduleId` – normalized schedule key (e.g., `WeekA`).
- `RunStatus` – `'completed'` or `'endedEarly'`.
- `BaseRowId` – links this run entry back to the base person row.
- `DeliveryOrder` – 0‑based order of this stop within the run.
- `Status` – `'delivered' | 'skipped'` for that run.
- `Dozens` – delivered dozens for that person in this run.
- `DonationStatus` – `'NotRecorded' | 'NoDonation' | 'Donated'`.
- `DonationMethod` – `'cash' | 'ach' | 'venmo' | 'paypal' | 'other'` or empty.
- `DonationAmount` – numeric donation amount for that run entry.
- `TaxableAmount` – taxable portion for that run entry.
- (Optional convenience) `Name`, `Address`, `City`, `State`, `ZIP`.

**TODO:**

- [ ] Decide final column set and ordering for `RunEntry` rows.
- [ ] Implement a new export helper that:
  - Serializes all `runEntries` from Dexie into these rows.
  - Appends them after the Delivery rows (same CSV file).

---

## 3. Export Behavior

### 3.1. `exportAll()` with history rows

**Current:**

- `BackupService.exportAll()`:
  - Reads `deliveries`, `importState`, `runEntries`.
  - Computes lifetime totals by `baseRowId`.
  - Produces a CSV with one row per delivery (Delivery rows only).

**Target:**

- Include **both**:
  1. Delivery rows (`RowType="Delivery"`).
  2. RunEntry rows (`RowType="RunEntry"`) for every `RunSnapshotEntry`.

**TODO:**

- [ ] Update `exportAll()` to:
  - Generate the Delivery rows as today, adding `RowType`.
  - Generate the RunEntry rows from all `runEntries` using the new schema.
  - Append RunEntry rows to the same `Papa.unparse` call (fields + rows).
- [ ] Confirm that `TotalDonation/TotalDozens/TotalTaxableDonation` remain lifetime totals that include:
  - Imported baseline from CSV.
  - All run history (`runEntries`).
  - Current live runs and one‑offs.

---

## 4. Import vs Restore Behavior

### 4.1. Import (new baseline data)

**Current:**

- `StorageService.importDeliveries(deliveries)`:
  - Clears `deliveries` and `routes`.
  - Seeds donation defaults and subscription flags.
  - Keeps `runs`, `runEntries`, and `importStates` by design.

**Target (unchanged structurally, but aware of RowType):**

- When importing a **standard CSV** (from user):
  - Only process rows where `RowType` is:
    - `"Delivery"`, or
    - not present (old files → treat as Delivery).
  - Ignore rows where `RowType="RunEntry"` (if user imports a backup file via the normal Import flow).
  - Continue to:
    - Clear `deliveries` + `routes`.
    - Create a new `importState` snapshot from Delivery rows only.
    - Leave `runs` + `runEntries` intact.

**TODO:**

- [ ] Extend CSV import parsing to:
  - Detect `RowType` column if present.
  - Filter out RunEntry rows for the normal Import flow.
- [ ] Ensure `importDeliveries` continues to be a pure “load new base file” operation.

### 4.2. Restore backup (full restore)

**New flow:**

- Triggered from a **Restore backup** button (likely on the Home page near Export).
- Steps:
  1. Ask for confirmation (reset warning).
  2. Let the user pick a CSV file (must be a backup format that includes Delivery + RunEntry rows).
  3. Parse CSV:
     - Partition rows by `RowType`:
       - `Delivery` rows → rebuild deliveries + routes + importState.
       - `RunEntry` rows → rebuild runs + runEntries.
  4. Clear current data before writing:
     - `deliveries`, `routes`, `runs`, `runEntries`, `importStates`.
  5. Populate:
     - `importStates` using the Delivery subset only.
     - `deliveries` + `routes` as in `importDeliveries`.
     - `runs` by grouping RunEntry rows on `RunId`:
       - `id = RunId`, `routeDate`, `weekType`, `date`, `status`.
     - `runEntries` directly from the rows.
  6. Show a toast confirming restore success and update:
     - `currentRoute` and `lastSelectedRoute` if appropriate.

**TODO:**

- [ ] Add `StorageService.clearAllData()`:
  - Clears `deliveries`, `routes`, `runs`, `runEntries`, `importStates`.
  - Leaves settings like dark mode, suggested rate, wake lock, etc. intact.
- [ ] Add a new `RestoreService` or reuse `BackupService` to:
  - Parse the CSV & orchestrate restore.
- [ ] Add a **Restore backup** UI element:
  - Likely a small danger‑styled link/button under the hero on Home:
    - “Restore from backup (CSV)”
  - With a strong confirm dialog.
- [ ] Ensure that, after restore:
  - Planner’s route dropdown & run history selector reflect the imported data.
  - Header progress works with restored deliveries.

---

## 5. Deduplication & Idempotence

To avoid double‑counting history when a backup is re‑imported and re‑exported:

- Normal **Import CSV**:
  - **Ignores** `RunEntry` rows, so it never duplicates history.

- **Restore backup**:
  - Always **clears** `runs` and `runEntries` first, then rebuilds them from the file.
  - The state in Dexie exactly matches the backup; re‑exporting that backup and restoring again should be idempotent (no duplicates).

**TODO:**

- [ ] Confirm that `RunId` from CSV is used as the Dexie `run.id` so runs are stable across round‑trips.
- [ ] Verify that later calls to `completeRun` create *new* `RunId`s that won’t conflict with existing ones from restore.

---

## 6. Testing Strategy

**TODO:**

- [ ] Add unit tests around:
  - Export of `RunEntry` rows from `runEntries`.
  - Import of Delivery rows with `RowType` present/missing.
  - Full restore of both deliveries and run history from a constructed CSV sample.
- [ ] Add a usage‑scenario test (similar to `USAGE-SCENARIO-TESTS.md`) for:
  1. Import baseline file with totals.
  2. Run 2–3 runs, plus some one‑off donations/deliveries.
  3. Export CSV (with Delivery + RunEntry rows).
  4. Wipe Dexie (via clearAll) and Restore from that CSV.
  5. Verify:
     - Planner shows same routes and people.
     - Run history viewer shows the same runs and entries.
     - Exported totals (TotalDonation/TotalDozens/TotalTaxableDonation) match those from before restore.

---

## 7. Open Questions / Decisions

- [ ] Exact column ordering for `RunEntry` rows (to keep the CSV easy to scan).
- [ ] Whether to include name/address columns on RunEntry rows (denormalized convenience vs. keeping it lean).
- [ ] UI wording and placement for the **Restore backup** control:
  - Likely a low‑prominence text link or small button under Backup, with strong warning.

---

As we implement this, we should:

- Keep this file in sync with what’s actually coded.
- Mark checkboxes (`[ ]` → `[x]`) as we complete tasks.
- Note any deviations from this plan so future work stays aligned. 
