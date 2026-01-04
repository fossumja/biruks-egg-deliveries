# Usage Scenario Tests

Manual, usage-focused scenarios that validate Planner, Run, and export behavior the way deliveries happen in real life.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-30
- **Type**: How-to
- **Scope**: manual usage scenarios and data-level automation coverage
- **Non-goals**: full end-to-end automation or UI test harness design
- **Applies to**: `src/app/**`, `src/testing/**`

## Overview

Use these scenarios to validate behavior that spans import, Planner actions, Run flow, receipts, and CSV exports. They complement the regression packs in `docs/testing/regression-tests.md`.

## When to use

- Before a release or seasonal rollout.
- After changes to Planner, Run, receipts, or backup/restore.
- When totals or history behavior changes.

## When not to use

- Documentation-only changes.
- Changes isolated to static content or styling with no behavioral impact.

## Prerequisites

- Start from a clean app state (recommended): clear local storage/IndexedDB or use a fresh profile.
- Import a real route CSV via **Import CSV** (or use the sample data if you are only smoke testing).
- For CSV edge-case checks, prepare a small CSV with header aliases, missing optional columns, and extra custom columns.
- Set the suggested donation rate on Home.
- Pick a single route in Planner (avoid All Schedules for these scenarios).
- If running on device or PWA, also run TP-11 from `docs/testing/regression-tests.md`.

## Automation coverage (current)

Data-level scenarios are automated with Jasmine/Karma to validate totals and export logic without UI interaction:

- `src/app/services/usage-scenario-totals.spec.ts` (one-off donations/deliveries, tax-year filtering, multi-run totals)
- `src/app/services/usage-scenario-runner.spec.ts` + `src/testing/scenario-runner.ts`
- `src/testing/fixtures/mini-route.fixture.ts`

These tests focus on `StorageService` and `BackupService`. Planner and Run UI flows remain manual.
Tax-year filtering and multi-year totals are covered in `usage-scenario-totals.spec.ts`; export filename year and UI switching remain manual.

## Manual scenarios

Use the checklist below and export a CSV after each scenario so you can compare totals and ordering.
Each scenario lists related regression packs (TP-xx) for reporting.

### Scenario 1: Baseline full run (no one-offs)

Related packs: TP-03, TP-07, TP-08.

Steps:

1. Run a route without editing quantities or using the hidden menu.
2. Mark a mix of Delivered and Skipped stops.
3. Complete the run and export a CSV.

Expected:

- Delivered and skipped statuses match the Run view.
- Delivered dozens match the planned values.
- Donation fields show "No Donation" and zero/blank amounts.
- Export ordering matches the Planner list.

### Scenario 2: Mixed donations and quantity changes

Related packs: TP-03, TP-07, TP-09.

Steps:

1. During the run, increase and decrease quantities for a few stops.
2. Record donations with different methods and custom amounts.
3. Complete the run and export.

Expected:

- Delivered dozens reflect changes made during the run.
- Donation status, method, and amount match the selections.
- Stops that were edited resolve to Delivered (not Pending/Changed).

### Scenario 3: One-off donations (no run)

Related packs: TP-03, TP-06.

Steps:

1. Use the Planner hidden menu to add one-off donations for a few stops.
2. Do not run a delivery for those stops.
3. Export a CSV.

Expected:

- Run status remains pending for those stops.
- TotalDonation reflects the one-off entries.
- TotalDozens remains unchanged.

### Scenario 4: One-off deliveries (no run)

Related packs: TP-03, TP-06.

Steps:

1. Use the hidden menu to add one-off deliveries with quantities and donations.
2. Export a CSV.

Expected:

- TotalDozens increases by the one-off delivered dozens.
- TotalDonation includes one-off donation amounts.
- Run status remains pending.

### Scenario 5: Unsubscribe and resubscribe

Related packs: TP-03, TP-05, TP-06, TP-07.

Steps:

1. Unsubscribe a few customers in Planner.
2. Add a one-off donation for an unsubscribed customer.
3. Run a route and complete deliveries for active customers.
4. Resubscribe one customer and deliver again.
5. Export a CSV.

Expected:

- Unsubscribed customers stay skipped and grouped at the end of the list.
- One-off donations are preserved even when unsubscribed.
- Resubscribed customers show new run receipts.

### Scenario 6: Ordering and reorder

Related packs: TP-03, TP-04.

Steps:

1. Edit "Order in route" for a few stops.
2. Use drag reorder for additional changes.
3. Export a CSV.

Expected:

- Planner order matches the exported row order.
- No gaps or duplicates in the order sequence.

### Scenario 7: Multi-run with interleaved one-offs

Related packs: TP-03, TP-06, TP-07, TP-08.

Steps:

1. Complete a baseline run and export.
2. Add one-off donations/deliveries, then export again.
3. Complete another run with mixed donations and quantities, then export.

Expected:

- Totals accumulate across runs and one-offs.
- All receipts view shows runs and one-offs in date order for the selected tax year.
- Export totals match the Planner totals for the selected tax year.
- Delete a receipt from **All receipts** and confirm the list and totals update.

### Scenario 8: Multi-year filtering and export

Related packs: TP-01, TP-03, TP-06, TP-08, TP-10.

Steps:

1. Set the tax year to the previous year and create a one-off donation with a date in that year.
2. Switch to the current tax year and create a one-off donation with a date in the current year.
3. On Home, switch between the two tax years.
4. Export a CSV for each selected tax year.

Expected:

- All receipts lists only the entries for the selected tax year.
- Planner totals update to reflect only the selected tax year.
- Export totals match the selected tax year.
- Export filename includes the selected tax year.

### Scenario 9: Donation amount validation edge cases

Related packs: TP-06, TP-07, TP-08, TP-09.

Steps:

1. In a one-off donation, set status to Donated and leave amount blank.
2. Switch status to None and confirm the amount resets to 0.
3. Enter a decimal donation amount greater than 100 (for example 125.50).
4. Enter an amount above 9999 and attempt to save.

Expected:

- Donated with a blank amount blocks save.
- None keeps the amount at 0 (treated as 0 in totals).
- Decimal amounts above 100 save successfully.
- Amounts over 9999 are rejected with a validation error.

### Scenario 10: CSV import edge cases

Related packs: TP-02, TP-10.

Steps:

1. Import a CSV with header aliases (for example, Schedule/Date, Qty/Dozens).
2. Import a CSV missing optional columns (Notes, Donation fields).
3. Import a CSV with an invalid numeric value in Dozens.
4. Import a CSV with extra custom columns, then export.

Expected:

- Header aliases map correctly and import succeeds.
- Missing optional columns do not block import.
- Invalid numeric Dozens triggers an import validation error.
- Extra custom columns are preserved in the export.

### Scenario 11: Backup/restore round-trip

Related packs: TP-03, TP-10.

Steps:

1. Complete a run and add at least one one-off donation.
2. Export a backup CSV and verify it includes RowType values for deliveries, runs, and run entries.
3. Restore from the backup and confirm the destructive overwrite warning.
4. Verify routes, run history, and totals after restore.

Expected:

- Backup contains RowType rows for deliveries, runs, and run entries.
- Restore rebuilds routes and run history correctly.
- Totals after restore match the selected tax-year totals.

### Scenario 12: Suggested rate changes and totals

Related packs: TP-03, TP-10.

Steps:

1. Set suggested donation rate A on Home.
2. Record a run donation and a one-off donation.
3. Change suggested donation rate to B.
4. Record another run donation and a one-off donation.
5. Export a CSV.

Expected:

- Totals and taxable amounts use the suggested rate from each event, not the latest rate.
- Export totals match Planner totals after the rate change.

### Scenario 13: Run completion reset and history ordering

Related packs: TP-07, TP-08.

Steps:

1. Complete a run with a mix of Delivered and Skipped stops.
2. On the run completion screen, verify the summary totals, donation/taxable amounts, and ended‑early indicator (if applicable).
3. Return to Planner and verify the live route reset.
4. Open run history and confirm the completed run appears first with the correct label/date.

Expected:

- Planner resets to the live route after completion.
- Run history is ordered newest-first and shows the latest run label/date.
- Run completion summary shows the expected totals and ended‑early indicator.

## Outcomes

- Manual scenarios confirm Planner, Run, and receipts behavior end to end.
- Exports reflect the same totals and ordering shown in the UI.

## Reporting

- Save exports using a clear name (for example, `scenario-2-mixed-donations.csv`).
- Record scenario, steps, and expected vs actual in the issue or PR.
- File a follow-up issue when discrepancies are found.

## Troubleshooting

- If totals look wrong, verify the selected tax year on Home.
- If receipts look missing, verify the selected tax year on Home.
- If one-off dates are rejected, ensure the date is within the selected tax year range shown in the UI.
- If receipts are missing, confirm the Planner selector is on the correct route (not Past runs).

## What changed / Why

- Rewrote the scenario plan to match the current data-level automation and trim long-form instructions.
- Added explicit manual checklists aligned with the current Planner/Run flows.
- Linked each scenario to regression pack IDs for reporting.

## Related docs

- `docs/testing/regression-tests.md`
- `docs/dev/best-practices/testing-practices.md`
- `docs/reference/csv-format.md`
- `docs/user/user-guide.md`
