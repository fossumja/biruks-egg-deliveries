# Regression Test Plan - Biruk's Egg Deliveries

This plan defines modular regression packs for the entire app so testing is reliable and scoped to the changes made. Use it to run targeted coverage for a feature change or a full regression before releases.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-30
- **Type**: How-to
- **Scope**: end-to-end regression coverage across all app features
- **Non-goals**: performance/load testing, backend API testing
- **Applies to**: `src/app/**`, `src/testing/**`, `public/**`

## Scope

Covered:

- Home, Planner, and Run flows.
- CSV import, export, backup, restore, and totals.
- One-off donations and deliveries.
- Run history, receipts, and edits.
- Storage and data utilities.
- PWA and device integrations (wake lock, sharing, maps, clipboard).

Not covered:

- Performance or load testing.
- Cross-browser certification beyond the target devices.
- Backend integration (this is a standalone app).

## Test strategy

- Use modular test packs to match the change scope.
- Prioritize data and service tests, then component tests, then manual scenarios.
- Run full regression packs before releases or high-risk changes.
- Treat device and PWA checks as manual until automated coverage exists.
- Use `npm test` (Karma + Jasmine) for automated specs, and `npm test -- --watch=false --browsers=ChromeHeadless --include <spec>` for scoped runs.

## Environments

- Local: `npm test` / `ng test` and manual browser checks.
- CI: headless test runs when configured.
- Device: iOS/Android browser + PWA checks using the TP-11 device matrix.

## Test pack catalog

| Pack ID | Name | Scope summary | Primary code areas | Automation status |
| --- | --- | --- | --- | --- |
| TP-01 | Home and app shell | Navigation, settings, help overlay, route resume | `src/app/pages/home.component.*`, `src/app/components/app-header.component.*` | Partial |
| TP-02 | CSV import and baseline data | Import, validation, sample data, routes list | `src/app/pages/home.component.*`, `src/app/services/storage.service.ts` | Partial |
| TP-03 | Backup, export, restore | Export formats, totals, restore parsing | `src/app/services/backup.service.ts`, `src/app/pages/home.component.*` | Partial |
| TP-04 | Planner core | Route selection, search, reorder, add/edit | `src/app/pages/route-planner.component.*` | Partial |
| TP-05 | Planner status actions | Skip/unskip, unsubscribe, reset, status pills | `src/app/pages/route-planner.component.*`, `src/app/services/storage.service.ts` | Minimal |
| TP-06 | One-off donations and deliveries | Planner hidden menu, date validation, totals | `src/app/pages/route-planner.component.*`, `src/app/services/storage.service.ts` | Partial |
| TP-07 | Run flow and donation controls | Deliver/skip, donations, qty changes | `src/app/pages/delivery-run.component.*`, `src/app/components/stop-delivery-card.component.*` | Partial |
| TP-08 | Run completion and receipts | Complete run, run history, receipts edits | `src/app/pages/route-planner.component.*`, `src/app/services/storage.service.ts` | Partial |
| TP-09 | Shared UI components | Donation controls, amount picker, toast | `src/app/components/**`, `src/app/services/toast.service.ts` | Minimal |
| TP-10 | Data and utilities | Storage, date utils, import state | `src/app/services/storage.service.ts`, `src/app/utils/**` | Partial |
| TP-11 | Device and PWA | Wake lock, share, maps, clipboard, manifest | `public/**`, `ngsw-config.json`, device APIs | Partial |

## Pack ID rules

- Pack IDs are stable. Do not renumber or reuse IDs.
- Add new packs by appending the next ID (for example, TP-12).
- If a pack is retired, mark it Deprecated but keep the ID for historical reports.
- Use pack IDs in PRs, issues, and test reports.

## Test pack details

### TP-01 Home and app shell

Scope:

- Navigation links and route persistence.
- Help overlay content and toggle.
- Suggested donation rate controls and persistence.
- Dark mode toggle and theme application.
- Tax year selector label and persistence.
- Build info display and fetch behavior.
- Accessibility and keyboard navigation for Home actions.

Automated coverage:

- `src/app/pages/home.component.spec.ts` (import/export/restore triggers, settings toggles, tax year persistence, route resume, multi-year warning).
- `src/app/components/app-header.component.spec.ts` (progress summary calculations).
- `src/app/app.component.spec.ts` (app shell bootstraps).

Accessibility checks are manual-only unless automated tooling is added.

Manual checks:

- Home buttons show correct enabled/disabled states.
- Tax year selector label and state persist after refresh.
- Keyboard tab order reaches import/export/help actions; focus is visible.
- Home inputs and buttons have visible labels or aria-labels.

### TP-02 CSV import and baseline data

Scope:

- CSV import validation (required columns, numeric dozens).
- Column normalization and preservation for export.
- Sample data auto-load when no routes exist.
- Routes list and counts on Home.

Automated coverage:

- `src/app/services/storage.service.spec.ts` (import normalization and baseline state).
- `src/app/pages/home.component.spec.ts` (import trigger and timestamp updates, CSV alias headers, missing optional columns, invalid numeric detection, custom columns preserved in import state).

Manual checks:

- Import accepts real route CSVs and shows helpful errors for malformed files.
- Imported routes appear with correct totals and can be opened.

### TP-03 Backup, export, restore

Scope:

- Export totals and history rows (delivery, run entry, one-off rows).
- Restore behavior for run history and one-off events.
- Event date normalization (Excel serials, date-only strings).
- Share API fallback and file naming.
- Backup/restore round-trip with RowType preservation.
- Export totals reflect per-event suggested amounts when suggested rate changes.

Automated coverage:

- `src/app/services/backup.service.spec.ts`
- `src/app/services/usage-scenario-totals.spec.ts` (per-event suggested amount totals).
- `src/app/services/usage-scenario-runner.spec.ts`
- `src/app/pages/home.component.spec.ts` (export/restore triggers, confirmation gating, and timestamps).

Tax-year totals assertions are covered in `usage-scenario-totals.spec.ts`; export filename year is covered in `backup.service.spec.ts`.

Manual checks:

- Backup CSV opens with all original columns preserved.
- Restore replaces existing data and rebuilds run history.
- Totals after restore match the selected tax-year totals.

### TP-04 Planner core

Scope:

- Route selection and All Schedules view.
- Search and filtering.
- Reorder toggle and drag behavior.
- Add delivery form validation and ordering.
- Edit delivery fields and route changes.
- Planner swipe gestures and back-card actions.
- Accessibility and keyboard navigation for Planner actions.

Automated coverage:

- `src/app/pages/route-planner.component.spec.ts` (route selection, search, reorder, swipe open/close with single-row enforcement, add/edit, back-card close for donation/delivery actions).

Manual checks:

- Reorder only works when toggle is active.
- New deliveries insert at the correct order and reindex.
- Search hides non-matching stops and is reversible.
- Switching between routes or All Schedules resets filters to the full list and closes any inline edits or swipe states.
- Trigger a back-card status action (skip/unsubscribe) and confirm the row closes after action.
- Drag reorder is blocked when the toggle is off; enabled drag does not conflict with swipe states.
- Tab order reaches search, add delivery, reorder toggle, and primary buttons; focus is visible.
- Planner form inputs and buttons have visible labels or aria-labels.

### TP-05 Planner status actions

Scope:

- Skip and unskip behavior.
- Unsubscribe and resubscribe behavior.
- Reset route and reset stop behavior.
- Status pills across Planner and Run views.
- Swipe back-card actions for status changes.

Automated coverage:

- `src/app/services/storage.service.spec.ts` (reset route/stop and unsubscribed preservation).

Swipe/back-card gestures are only partially covered in `route-planner.component.spec.ts`; status-action reliability is manual.

Manual checks:

- Unsubscribed stops move to the end and stay skipped after reset.
- Reset does not resubscribe users.
- Swipe open a row and confirm skip/unskip/unsubscribe actions are clickable and close the row.

### TP-06 One-off donations and deliveries

Scope:

- Hidden menu donation and delivery flows.
- Date validation and allowed year range tied to the selected tax year.
- Donation type selection and amount handling.
- Donation amount validation (required when Donated, optional when NotRecorded, 0–9999 cap, decimals).
- Totals and receipts inclusion.
- Accessibility and keyboard navigation for one-off dialogs.

Automated coverage:

- `src/app/pages/route-planner.component.spec.ts` (hidden menu swipe/toggle, one-off validation, receipts edits).
- `src/app/services/usage-scenario-totals.spec.ts` (one-off totals).

Date range tied to the selected tax year and UI min/max attributes are covered in `route-planner.component.spec.ts`.
Donation validation rules are partially covered in `route-planner.component.spec.ts`; picker invalid-input error states are covered in `donation-amount-picker.component.spec.ts`.

Manual checks:

- One-off saves do not change live run status.
- Totals include one-off donations and deliveries.
- One-off modals show a compact receipt history list (including skips) for the selected person.
- Switch tax year and confirm the one-off date min/max updates to the selected year window.
- Status=Donated requires an amount; NotRecorded allows blank (treated as 0 in totals).
- Amount accepts decimals and values above 100; 10000+ is rejected.
- Tab order reaches save/cancel and donation controls in one-off dialogs; focus is visible.
- One-off form inputs and buttons have visible labels or aria-labels.

### TP-07 Run flow and donation controls

Scope:

- Deliver and skip actions with reasons.
- Quantity adjustments and status changes.
- Donation status and method toggles.
- Donation amount entry with decimals and validation.
- Address copy and map launch behavior.
- End run early behavior (remaining stops skipped with reason).
- Accessibility and keyboard navigation for Run actions.

Automated coverage:

- `src/app/pages/delivery-run.component.spec.ts` (deliver/skip/end early, donation updates).
- `src/app/components/stop-delivery-card.component.spec.ts` (stop card event wiring).
- `src/app/services/storage.service.spec.ts` (change status logic).

Manual checks:

- Status transitions: Pending -> Changed -> Delivered.
- Skip dialog updates counts and progress.
- Enter a decimal donation amount > 100 and confirm save works.
- End a run early and confirm remaining stops are skipped with the correct reason.
- Tab order reaches Deliver/Skip/End Run actions and dialogs; focus is visible.
- Run screen buttons and inputs have visible labels or aria-labels.

### TP-08 Run completion and receipts

Scope:

- Complete run, end early, and archive behaviors.
- Run history selection and run entry ordering.
- All receipts view (runs + one-offs).
- Editing run entries and one-off receipts.
- Run/receipt navigation resets edit state.
- Receipt edit validation for donation status + amount.

Automated coverage:

- `src/app/services/storage.service.spec.ts` (run completion and resets).
- `src/app/pages/route-planner.component.spec.ts` (receipts sorting and edits).
- `src/app/services/usage-scenario-totals.spec.ts` (tax-year receipt filtering).

All receipts tax-year filtering is covered in `usage-scenario-totals.spec.ts` and `route-planner.component.spec.ts`.
Receipt validation behavior (amount required/max) is covered in `route-planner.component.spec.ts`; UI error styling remains manual.
Navigation/reset behavior for receipts is covered in `route-planner.component.spec.ts`.
Run completion reset behavior is covered in `storage.service.spec.ts`; UI history ordering remains manual.

Manual checks:

- Completing a run resets the route for the next run.
- All receipts view shows both run entries and one-offs for the selected tax year.
- Delete a receipt from **All receipts** and confirm it disappears and totals refresh.
- Delete a receipt from **Past runs** and confirm it disappears and totals refresh.
- Delete a receipt from the one‑off modal history list and confirm it disappears and totals refresh.
- Switch tax year and confirm All receipts and totals update to the selected year.
- Edit a receipt: Donated requires an amount; NotRecorded allows blank.
- Switching between a specific run and **All receipts** closes any inline edit panel and resets the list to full entries.
- One-off receipts allow editing date and suggested amount; run receipts do not.
- Complete a run and confirm Planner resets to the live route and the run appears first in history with the correct label/date.
- On the run completion screen, verify the summary shows totals, donation/taxable amounts, and the ended‑early indicator when applicable.

### TP-09 Shared UI components

Scope:

- Donation controls defaulting and reselect behavior.
- Donation amount picker defaults and save/cancel.
- Stop card emits correct events.
- Toast message lifecycle.
- Donation amount picker validation and error states.

Automated coverage:

- `src/app/components/stop-delivery-card.component.spec.ts` (event emissions).
- `src/app/components/donation-amount-picker.component.spec.ts`

Donation amount picker validation (max and invalid input) is covered in `donation-amount-picker.component.spec.ts`; UI error styling remains manual.

Manual checks:

- Donation controls respect allow-reselect behavior.
- Toasts appear and auto-dismiss.
- Invalid picker input shows an error and disables Save; valid input clears the error.

### TP-10 Data and utilities

Scope:

- Storage state transitions and persistence.
- Import state save/load and baseRowId handling.
- Date normalization rules and sorting.
 - Import parsing and validation utilities.
- Totals calculations under suggested rate changes.
- Dexie migration safety and upgrade persistence checks.

Automated coverage:

- `src/app/services/storage.service.spec.ts`
- `src/app/services/backup.service.spec.ts`
- `src/app/services/usage-scenario-totals.spec.ts`
- `src/app/services/usage-scenario-runner.spec.ts`

Totals with suggested rate changes are covered in `usage-scenario-totals.spec.ts`.
Dexie migration upgrade coverage exists in `storage.service.spec.ts` for legacy data upgrades; device upgrade flows remain manual.

Manual checks:

- Suggested donation rate persists across sessions.
- Import state survives backup and restore.
- Switch tax year and confirm totals/exports are computed for the selected year.
- Suggested rate changes do not retroactively alter existing totals.
- With existing data present, upgrade to a new build and confirm deliveries, runs, and one-offs persist.
- Verify import state and totals survive a refresh after upgrade.

### TP-11 Device and PWA

Scope:

- Wake lock support and fallback behavior.
- Share API fallback to download.
- Maps deep links and clipboard copy.
- PWA manifest and service worker caching.
- Backup and restore flows on device.

Automated coverage:

- Unit tests cover share/download fallback, maps links, clipboard flows, and service worker registration options (`app.config.spec.ts`).
- Device and PWA install/offline checks remain manual.
Offline cache, service worker update, and install flow checks are manual-only today.

Device matrix (minimum regression target):

| Platform | Mode | Minimum OS | Minimum browser |
| --- | --- | --- | --- |
| iOS | Safari (browser) | iOS 16 | Safari 16 |
| iOS | PWA (Add to Home Screen) | iOS 16 | Safari 16 |
| Android | Chrome (browser) | Android 12 | Chrome 120 |
| Android | PWA (installed) | Android 12 | Chrome 120 |

Notes:

- Update these minimums when support policy changes or the device fleet shifts.
- Wake lock is expected to be unsupported on iOS; confirm the fallback message.

Manual checks:

- Wake lock: toggle on/off and confirm the UI state and localStorage value update.
- Share/download: run Backup CSV and confirm the share sheet or download fallback.
- Restore: follow the two-step backup-then-restore flow; confirm routes and history reload.
- Maps: open a stop and confirm the deep link opens a maps app.
- Clipboard: copy a stop address and paste into a notes app.
- Gestures: swipe to reveal the Planner hidden menu; drag reorder works only when enabled.
- PWA assets: app icon and splash screen assets render correctly.
- Offline cache: load the app, go offline, refresh, and confirm the app shell and core screens load.
- Service worker update: after a new deploy, reload and confirm the app updates to the latest build (prompt or refresh flow).

## Change-impact map

Use this table to choose packs based on changed files.

| Change area | Required packs | Notes |
| --- | --- | --- |
| `src/app/app.component.*` | TP-01 | App shell bootstrapping and base layout. |
| `src/app/app.config.ts` | TP-01, TP-11 | Router setup and service worker registration. |
| `src/app/app.routes.ts` | TP-01 | Navigation and route wiring. |
| `src/app/pages/home.component.*` | TP-01, TP-02, TP-03, TP-11 | Home owns import/export/restore and settings. |
| `src/app/components/app-header.component.*` | TP-01 | Header progress and navigation. |
| `src/app/pages/route-planner.component.*` | TP-04, TP-05, TP-06, TP-08 | Planner owns editing, one-offs, and receipts. |
| `src/app/pages/delivery-run.component.*` | TP-07, TP-08 | Run flow and completion logic. |
| `src/app/services/build-info.service.ts` | TP-01 | Build info display. |
| `src/app/services/storage.service.ts` | TP-02, TP-03, TP-04, TP-05, TP-06, TP-07, TP-08, TP-10 | Storage touches most workflows. |
| `src/app/services/backup.service.ts` | TP-03, TP-08, TP-10 | Export, totals, and history. |
| `src/app/services/toast.service.ts` | TP-01, TP-09 | Toast behaviors used across screens. |
| `src/app/components/donation-controls.component.*` | TP-06, TP-07, TP-09 | Used in Planner and Run. |
| `src/app/components/stop-delivery-card.component.*` | TP-07, TP-09 | Run card behaviors. |
| `src/app/components/donation-amount-picker.component.*` | TP-06, TP-07, TP-09 | Used in one-offs and run. |
| `src/app/utils/date-utils.ts` | TP-03, TP-06, TP-08, TP-10 | Affects restore and receipts. |
| `public/**`, `ngsw-config.json` | TP-11 | PWA behaviors and assets. |

If changes span more than three packs or touch storage + backup, run a full regression.

## Acceptance criteria

- Targeted change: all required packs for the change area are executed with no failures.
- Release: all packs TP-01 through TP-11 are executed, plus usage scenarios.
- Any known failures are documented with follow-up issues.

## Reporting

- Record test packs run and results in the PR or release notes.
- Update this plan when new features or tests are added.

## What changed / Why

- Added pack ID governance so reports stay consistent over time.
- Updated automation coverage notes to reflect current component and service specs.
- Expanded the change-impact map for app shell services.
- Documented the device/PWA matrix and manual checklist for TP-11.
- Noted automated coverage for share/maps/clipboard to keep TP-11 status current.
- Noted automated coverage for Planner swipe/hidden menu interactions.

## Related docs

- `docs/testing/usage-scenario-tests.md`
- `docs/dev/best-practices/testing-practices.md`
- `docs/dev/workflows/testing.md`
- `.github/prompts/testing.prompt.md`
- `docs/dev/workflows/quality.md`
