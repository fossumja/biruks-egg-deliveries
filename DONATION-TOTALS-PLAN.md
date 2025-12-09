# Donation Totals & Deductible Contribution Plan

## Goals

- Make donation totals and “Deductible charitable contribution” consistent everywhere:
  - Planner hidden-menu donation page.
  - All receipts / past runs view.
  - Exported CSV / backups.
- Use a **global** formula per customer, not per-receipt summing of taxable amounts:
  - `totalDonation = sum of all money paid for that customer`
  - `totalDozensDelivered = sum of all dozens actually delivered`
  - `totalBaselineValue = sum of (dozensDelivered_at_event × suggestedRate_at_that_time)`
  - `totalDeductibleContribution = max(0, totalDonation − totalBaselineValue)`
- Keep enough per-event data so we can always recompute totals, even if the suggested rate changes in the future.

## Current Behavior (high-level)

- We track per-customer receipts as:
  - **Run entries** (`runEntries` / `RunSnapshotEntry`):
    - `dozens`, `donationAmount`, `taxableAmount`.
  - **Live deliveries** (`Delivery`):
    - `dozens` / `deliveredDozens`, `donation` (with `amount`, `suggestedAmount`, `taxableAmount` sometimes set).
  - **One-off donations/deliveries**:
    - `Delivery.oneOffDonations: DonationInfo[]`
    - `Delivery.oneOffDeliveries: { deliveredDozens?: number; donation?: DonationInfo; date?: string }[]`.

- `BackupService.computeTotalsByBase(...)` currently:
  - Starts from any totals in the import state (if present) as a baseline.
  - Adds contributions from:
    - `RunSnapshotEntry` rows (using `donationAmount`, `dozens`, `taxableAmount`).
    - Live deliveries (only when `status === 'delivered'`).
    - One-offs (donations and deliveries) via their `DonationInfo`.
  - Sums **per-receipt taxableAmount** to get the final `taxable` total.
  - Exports:
    - `TotalDonation` = sum of donation amounts.
    - `TotalDozens` = sum of dozens.
    - `TotalDeductibleContribution` = current `taxable` sum.

- Donation UI totals (hidden menu / donation modal):
  - Use a similar pattern: sum per-event donation amounts, dozens and taxable amounts and display them.

Effect: we are essentially doing:
> `totalDeductibleContribution = Σ max(0, amount_i − suggested_i)`

instead of:
> `totalDeductibleContribution = max(0, Σ amount_i − Σ suggested_i)`

The new behavior should use the **global** formula.

## Desired Model

Per customer (`baseRowId`):

- `totalDonation`  
  - Sum of all dollars paid (runs + one-off deliveries + one-off donations).
- `totalDozensDelivered`  
  - Sum of dozens actually delivered (runs + one-off deliveries, but *not* one-off donations).
- `totalBaselineValue`  
  - Sum over all **delivery events** of `(dozensDelivered_at_event × suggestedRate_at_that_time)`.
  - This equals “what they would have paid if they always paid the suggested rate at the time of each delivery”.
- `totalDeductibleContribution`  
  - `max(0, totalDonation − totalBaselineValue)`.

Notes:

- One-off donations are just extra dollars in `totalDonation`. They do not add dozens; their effect is purely to increase `totalDonation`.
- We do **not** need a separate `coveredDozens` field to calculate the totals, as long as we:
  - Count dozens only on delivery events (runs + one-off deliveries).
  - Never add dozens for pure donation events.

## Data We Should Track Per Event

- For each **delivery event** (run entry or one-off delivery):
  - `dozensDelivered` – actual dozens delivered.
  - `suggestedAmountAtTime` – what the suggested donation for that event was when it happened.
    - Usually `dozensDelivered × suggestedRate_at_that_time`.
  - `amountPaid` – donation attached to that delivery (if any, possibly 0).
  - `date` – already tracked as `DeliveredAt` / `EventDate`.

- For each **pure donation event** (one-off donation not tied to a delivery):
  - `amountPaid` – actual dollars donated.
  - `date` – already tracked as `EventDate`.
  - No additional dozens: these dollars will still be part of `totalDonation`, while the dozens they “cover” remain in the existing delivery receipts.

Implementation-wise, we will use the existing `DonationInfo` and related structures but be careful about:

- Treating `DonationInfo.suggestedAmount` on deliveries as “baseline amount for that delivery at the time”.
- Ensuring one-off donations **do not** change any dozens totals.

## Implementation Plan

### 1. Introduce a single totals helper

**TODO:**

- [ ] Add a pure helper (in `StorageService` or a dedicated util) that computes per-customer totals from receipts:
  - Input: `baseRowId`, all deliveries, all run entries, and one-offs.
  - Output:
    - `totalDonation: number`
    - `totalDozensDelivered: number`
    - `totalBaselineValue: number`
    - `totalDeductibleContribution: number`

**Logic sketch:**

- Initialize `donation = 0`, `dozens = 0`, `baseline = 0`.
- For each **run entry** for that `baseRowId`:
  - If `status === 'delivered'`:
    - `dozens += entry.dozens`
    - Determine `suggestedAtTime`:
      - Prefer `suggestedAmount` on the attached `DonationInfo` if we start storing it there.
      - Else fallback to `entry.dozens × suggestedRate_current` (approximation).
    - `baseline += suggestedAtTime`.
  - If donation status is `Donated`:
    - `donation += entry.donationAmount`.

- For each **Delivery** in the route with that `baseRowId` (live state):
  - If `status === 'delivered'`:
    - `dozens += deliveredDozens` (or planned dozens if no separate field).
    - Compute `suggestedAtTime` as above and add to `baseline`.
  - If the attached `donation.status === 'Donated'`:
    - `donation += donation.amount`.

- For each **one-off delivery** for this delivery:
  - `dozens += deliveredDozens`.
  - Compute `suggestedAtTime = deliveredDozens × suggestedRate_at_that_time` (captured or approximated).
  - `baseline += suggestedAtTime`.
  - If there is a `donation` attached and `status === 'Donated'`:
    - `donation += donation.amount`.

- For each **one-off donation** for this delivery:
  - If `status === 'Donated'`:
    - `donation += donation.amount`.
  - Do **not** add dozens or baseline here (their deliveries are already in the delivery events).

- After aggregating:
  - `totalDonation = donation`.
  - `totalDozensDelivered = dozens`.
  - `totalBaselineValue = baseline`.
  - `totalDeductibleContribution = Math.max(0, totalDonation − totalBaselineValue)`.

### 2. Adjust `BackupService.computeTotalsByBase`

**TODO:**

- [ ] Update `BackupService.computeTotalsByBase(...)` to use the new helper instead of summing per-receipt `taxableAmount`.
- [ ] Ensure it still respects `importState` for baseline-only imports:
  - For `importState.mode === 'baseline'`:
    - Use the CSV’s `TotalDonation` / `TotalDozens` as **starting baseline**.
    - Add contributions from in-app receipts on top.
  - For `importState.mode === 'restored'`:
    - Assume we have the full event history; recompute all totals from receipts only.

**Export behavior:**

- `TotalDonation` column:
  - Use `totalDonation` from the helper.
- `TotalDozens` column:
  - Use `totalDozensDelivered` from the helper.
- `TotalDeductibleContribution` column:
  - Use `totalDeductibleContribution` from the helper.

We no longer rely on summing `taxableAmount` per receipt for the exported totals.

### 3. Donation totals UI (Planner hidden-menu donation page)

**TODO:**

- [ ] Identify the donation totals card on the Planner donation modal / hidden menu.
- [ ] Replace its internal “sum donations / dozens / taxable” logic with:
  - Fetch receipts for that customer (current route deliveries + run entries + one-offs).
  - Call the same totals helper.
  - Display:
    - `Total donation: $X`
    - `Total dozen: N`
    - `Baseline value: $Y` (optional, but user requested to see `totalBaselineValue`).
    - `Deductible charitable contribution: $Z` (where `Z = totalDeductibleContribution`).

Result: the donation page totals will match the CSV/backup totals.

### 4. Ensure one-off donations never double-count dozens

**TODO:**

- [ ] Audit creation of one-off donations (`appendOneOffDonation` and related UI):
  - Confirm that they **do not** add to any dozens count.
  - Confirm that only one-off **deliveries** add dozens.
- [ ] Make it explicit in the totals helper that one-off donations only affect `totalDonation`, not `totalDozensDelivered` or `totalBaselineValue`.

This guarantees that late payments for past deliveries don’t double-count eggs in the totals.

### 5. Track suggested baseline per delivery event

We want `totalBaselineValue` to remain meaningful even if the suggested rate changes in Settings later.

**TODO:**

- [ ] For run deliveries and one-off deliveries:
  - Ensure `DonationInfo.suggestedAmount` (or an equivalent field) is set at the time of the event:
    - `suggestedAmount = dozensDelivered × suggestedRate_current`.
  - In the totals helper, prefer using this stored `suggestedAmount`, falling back to `dozensDelivered × currentSuggestedRate` only if `suggestedAmount` is missing.
- [ ] For imported/restored data:
  - When restoring from a backup CSV that already has a per-receipt `SuggestedAmount` or `RunTaxableAmount`, map that into the restored `DonationInfo.suggestedAmount` when possible.

This way, `totalBaselineValue` reflects historical rates, but still uses the same global formula.

### 6. CSV export & restore columns

**TODO:**

- [ ] Extend **backup CSV** row formats so we can fully reconstruct receipts:
  - `RunEntry` rows:
    - Already carry: `RunId`, `RouteDate`, `ScheduleId`, `RunStatus`, `RunBaseRowId`, `RunDeliveryOrder`, `RunEntryStatus`, `RunDozens`, `RunDonationStatus`, `RunDonationMethod`, `RunDonationAmount`, `RunTaxableAmount`, `RunCompletedAt`, `EventDate`.
    - Add/standardize: `SuggestedAmount` for the baseline dollars of that delivery event (if not already present).
  - `OneOffDelivery` rows:
    - Already carry: `RunBaseRowId`, `RunDozens`, `RunDonationStatus`, `RunDonationMethod`, `RunDonationAmount`, `RunTaxableAmount`, `EventDate`.
    - Add/standardize: `SuggestedAmount` for that one-off delivery’s baseline.
  - `OneOffDonation` rows:
    - Already carry: `RunBaseRowId`, `RunDonationStatus`, `RunDonationMethod`, `RunDonationAmount`, `RunTaxableAmount`, `EventDate`.
    - No dozens; these rows feed only `totalDonation`.
- [ ] For **Delivery** rows in backups:
  - Keep them as per-customer snapshots:
    - `TotalDonation`, `TotalDozens`, `TotalDeductibleContribution`.
  - These act as convenience columns; the true source of truth is the reconstructed receipts.
- [ ] On **restore**:
  - For each `RunEntry` row:
    - Create a `RunSnapshotEntry` and, where `SuggestedAmount` is present, map it to the associated delivery’s `DonationInfo.suggestedAmount`.
  - For each `OneOffDelivery` row:
    - Attach an entry to `Delivery.oneOffDeliveries` with:
      - `deliveredDozens = RunDozens`.
      - `donation` built from `RunDonationStatus`, `RunDonationMethod`, `RunDonationAmount`, and `SuggestedAmount` (if present).
      - `date = EventDate`.
  - For each `OneOffDonation` row:
    - Append to `Delivery.oneOffDonations` a `DonationInfo` built from:
      - `status = RunDonationStatus`, `method = RunDonationMethod`, `amount = RunDonationAmount`.
      - Optional `suggestedAmount` if we decide to persist any baseline there.
      - `date = EventDate`.
  - `Delivery` rows themselves are restored as baseline route stops (as today), but their per-person totals will be recalculated from receipts when exporting again.

We do **not** need a `coveredDozens` column if we keep the rule “dozens tracked only on deliveries”.

### 8. Import vs Backup/Restore: how data flows

We need to clearly distinguish:

- **Import (CSV)** – user-provided deliveries file (no history).
- **Backup/Restore (CSV)** – full round-trip of all receipts + per-person snapshots.

**Import (CSV)**:

- Input file:
  - Usually only has Delivery rows (no `RowType` or `RunEntry`/`OneOff*` rows).
  - May contain original `TotalDonation`, `TotalDozens`, and an older taxable/total column.
- Behavior:
  - `parseCsvText` normalizes rows into `Delivery` records and builds an `importState` with:
    - `headers`, `rowsByBaseRowId`, `mode: 'baseline'`.
  - We treat those totals as a **starting baseline** for that dataset:
    - When `computeTotalsByBase` runs with `mode === 'baseline'`, it:
      - Reads `TotalDonation` / `TotalDozens` / any legacy taxable column from `importState`.
      - Adds contributions from in-app **receipts** (runs + one-offs + live deliveries) on top.
  - We do **not** expect to reconstruct historic receipts from an import file alone; imports are for seeding the current delivery list.

**Backup/Restore (CSV)**:

- Backup (`exportAll`):
  - Writes:
    - Per-customer `Delivery` rows (one per `baseRowId`) with `TotalDonation`, `TotalDozens`, `TotalDeductibleContribution`.
    - Per-event `RunEntry`, `OneOffDelivery`, and `OneOffDonation` rows carrying all fields needed to reconstruct receipts:
      - IDs, baseRowId, dozens, donation status/method/amount, `SuggestedAmount`, `EventDate`, etc.
  - These files are intended for full round-trip backups.

- Restore (`restoreFromBackupFile`):
  - Parses CSV and routes rows by `RowType`:
    - `Delivery` rows → route baseline stops.
    - `RunEntry` → `runs` table + `runEntries` table.
    - `OneOffDelivery` / `OneOffDonation` → attached to each `Delivery` as one-off receipts.
  - Creates an `importState` with `mode: 'restored'` to signal that:
    - We now have a complete event history.
    - `computeTotalsByBase` should ignore any historic total columns in `rowsByBaseRowId` and instead derive totals from receipts only.
  - After restore:
    - The app has enough information to rebuild:
      - Per-person totals (donation, dozens, baseline, deductible).
      - All receipts, including dates and methods.
      - The All receipts and past-runs views.
    - A subsequent backup/export will produce a CSV equivalent in terms of history and totals.

With this, a backup CSV is sufficient to recreate **all** donation/delivery history and recompute all totals; a simple import CSV is not, and is treated explicitly as “live baseline only.” 

### 7. Tests & validation

**TODO:**

- [ ] Update `USAGE-SCENARIO-TESTS.md` and the scenario runner to assert:
  - For a customer with multiple runs and one-offs, `TotalDonation`, `TotalDozens`, and `TotalDeductibleContribution` match the global formula.
  - Editing a past receipt’s donation amount or dozens updates totals accordingly.
- [ ] Add specific tests for:
  - One-off donation after multiple deliveries: totals use the existing delivery dozens plus late donation to compute `totalDeductibleContribution` correctly.
  - Changing the suggested rate mid-year: baseline uses historic `suggestedAmount` per event where available.

Once these steps are done, the app will:

- Use the same global deductible logic everywhere (UI and CSV).
- Avoid double-counting dozens from late donations.
- Remain robust if the suggested rate changes in the future, because we can always recompute totals from the core receipts data. 
*** End Patch***"""
