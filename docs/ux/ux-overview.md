# UX Overview

Inventory of current screens, shared UI components, and styling touchpoints to keep UX consistent as the app evolves.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-26
- **Type**: Reference
- **Scope**: UI surfaces, shared components, and styling references
- **Non-goals**: detailed visual specs (see style guide)
- **Applies to**: `src/app/pages/**`, `src/app/components/**`

## Screen & Component Inventory

This document captures the current UI so we can keep the experience consistent with the style guide as features evolve.

### Screens

- **Home (`home.component`)**
  - Import/export CSV.
  - Restore backup (CSV) action with a strong confirmation flow.
  - Route list and selection.
  - “Suggested donation per dozen” setting.
  - “Keep screen awake” and dark‑mode toggles.
  - Build info / last updated footer.

- **Route Planner (`route-planner.component`)**
  - Route selector (including “All Schedules”).
  - Run selector for a single schedule (Current live vs archived runs), plus “Add delivery” and search actions, frozen at top.
  - Cards for each person: name, address, status pill, quantity controls.
  - Archived run view is read‑only (no hidden menu, no drag handles).
  - Drag‑and‑drop reordering via a dedicated handle.
  - Hidden menu per card (swipe/tap): **Reset**, **Edit**, **Skip**, **Donation**, **Delivery**.
  - Swipe rows use explicit front/back card layers; open state disables front‑card clicks so back actions are reliable.
  - Inline edit panel for updating details, schedule, and order‑in‑route.
  - Donation and off‑schedule delivery modals (using shared donation/delivery components).
  - One-off modals include a compact receipt history list under the card.

- **Delivery Run (`delivery-run.component`)**
  - Current stop card with name, address, note, quantity, and donation controls.
  - Status pill that matches Planner (pending / delivered / skipped / changed / unsubscribed).
  - “Deliver” / “Skip” actions and next‑stop navigation.
  - “Open Map” and “Copy” address actions.
  - Compact “Next up” summary for the upcoming stop.
  - Finished state with “Backup now”, “Complete run” (archives history + resets), and “Done”.

### Shared / Supporting

- **Services**
  - `StorageService` (Dexie‑backed local DB, suggested rate, wake lock state, etc.).
  - `BackupService` (CSV import/export, route/donation totals).
- **Components**
  - `DonationAmountPickerComponent` (legacy, now largely folded into `DonationControlsComponent`).
  - `DonationControlsComponent` (donation type + amount picker used on run card and one‑off donation UI).
  - `StopDeliveryCardComponent` (shared layout/logic for delivery cards on Run and off‑schedule flows).
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
