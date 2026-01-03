# UX Overview

Inventory of current screens, shared UI components, and styling touchpoints to keep UX consistent as the app evolves.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-29
- **Type**: Reference
- **Scope**: UI surfaces, shared components, and styling references
- **Non-goals**: detailed visual specs (see style guide)
- **Applies to**: `src/app/pages/**`, `src/app/components/**`

## Screen & Component Inventory

This document captures the current UI so we can keep the experience consistent with the style guide as features evolve.

### Screens

- **Home (`home.component`)**
  - Import CSV, backup CSV, and restore CSV (restore prompts for backup first).
  - Tax year selector with a multi-year warning for export accuracy.
  - “Suggested donation per dozen” setting.
  - “Keep screen awake” and dark‑mode toggles.
  - Help overlay with the in-app guide.
  - Build info / last updated footer.

- **Route Planner (`route-planner.component`)**
  - Route selector (including “All Schedules”) and past runs, plus “All receipts”.
  - Add delivery, search, and reorder actions in the header for live routes.
  - Cards for each person: name, address, status pill, quantity controls.
  - Past run/receipt views support inline edits for status, dozens, and donation fields.
  - Drag‑and‑drop reordering via a dedicated handle.
  - Hidden menu per card (swipe/tap): **Reset**, **Edit**, **Skip/Unskip/Resubscribe**, **Donation**, **Delivery**.
  - Swipe rows use explicit front/back card layers; open state disables front‑card clicks so back actions are reliable.
  - Inline edit panel for updating details, schedule, order‑in‑route, and unsubscribe state.
  - Inline donation and off‑schedule delivery panels, plus a shared amount picker overlay.
  - One-off panels include a compact receipt history list under the card.

- **Delivery Run (`delivery-run.component`)**
  - Current stop card with name, address, note, quantity, and donation controls.
  - Status pill that matches Planner (pending / delivered / skipped / changed / unsubscribed).
  - “Deliver” / “Skip” actions and next‑stop navigation.
  - “Open Map” and “Copy” address actions.
  - Compact “Next up” summary for the upcoming stop.
  - Finished state includes a compact run completion summary (counts, dozens, donation totals, ended-early indicator) plus “Backup now” and “Complete run”.

### Shared / Supporting

- **Services**
  - `StorageService` (Dexie‑backed local DB, suggested rate, wake lock state, etc.).
  - `BackupService` (CSV import/export, route/donation totals).
- **Components**
  - `AppHeaderComponent` (logo, progress bar, and Home/Planner/Run navigation).
  - `DonationAmountPickerComponent` (shared amount selector used on Run and Planner).
  - `DonationControlsComponent` (donation status, method, and amount controls).
  - `StopDeliveryCardComponent` (shared layout/logic for delivery cards on Run and off‑schedule flows).
  - `ToastComponent` (global feedback toasts).
- **Assets / Manifest**
  - PWA manifest and icons in `public/manifest.webmanifest` and `public/icons/`.

### Styling State

- Global tokens (colors, typography, spacing, radii, shadows) live in `src/styles.scss`.
- Page‑level SCSS files (`home`, `route-planner`, `delivery-run`, header, donation controls) use those tokens for light and dark themes.
- App shell/header and progress bar are shared across pages for a consistent, iOS‑like layout.

### Test Coverage (current)

- Unit/component tests exist for:
  - Storage and CSV export totals (including one‑off donations/deliveries).
  - Multi‑run usage scenarios.
- Gesture behavior (swipe + drag) and PWA/iOS specifics are tracked as **manual regression** items in:
  - `docs/testing/regression-tests.md`
  - `docs/testing/usage-scenario-tests.md`
