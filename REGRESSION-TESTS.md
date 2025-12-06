# Regression Test Plan – Biruk's Egg Deliveries

This document tracks the core behaviors of the app and how we intend to regression‑test them as the code evolves.

It’s organized by feature area and maps to the main components/services in the repo.

---

## 1. Import, Routes, and Home Page

**Code:**  
- Home component: `src/app/pages/home.component.ts/html/scss`  
- Storage service: `src/app/services/storage.service.ts`  
- Backup/export: `src/app/services/backup.service.ts` (and CSV helpers)

**Behaviors to verify**
- [ ] CSV import accepts the real route files (e.g., “A Week Deliveries 2025.csv”) and fails with a clear message when required columns are missing or malformed.
- [ ] All input columns (including unused ones) are preserved in the import state so they can be exported later in the original order.
- [ ] Route list on Home reflects imported routes with accurate counts (delivered / skipped / total).
- [ ] “Start Route / Planner / Run” navigation uses the selected route and persists the last selected route in local storage.
- [ ] Export (Backup CSV) writes:
  - [ ] All original CSV columns in the same order.
  - [ ] Additional columns for delivery/donation state (including totals).
  - [ ] Data that matches what has been recorded in the app (see sections 3–5).

**Planned automated tests**
- [ ] Unit tests for `StorageService.importDeliveries` + CSV normalization.
- [ ] Unit tests for `BackupService.exportAll()` (or equivalent) verifying columns and ordering.

---

## 2. Planner Page – Core Route Editing

**Code:**  
- Planner component: `src/app/pages/route-planner.component.ts/html/scss`  
- Storage: `StorageService` (route queries, saveSortOrder, resetRoute, etc.)

**Behaviors to verify**
- [ ] Route selector + header (sticky at top) always show the active route and “All Schedules” option.
- [ ] “Reset Route”:
  - [ ] Clears per‑run status, donation, and quantity overrides for subscribed stops.
  - [ ] Does **not** resubscribe unsubscribed customers.
- [ ] “Add Delivery”:
  - [ ] Defaults Schedule to the current route’s schedule.
  - [ ] Requires name and a positive dozen count; address fields may be blank.
  - [ ] Honors “Order in route” to insert the new person at the correct position and reindex the rest.
- [ ] Inline “Edit delivery”:
  - [ ] Opens below the selected person’s card.
  - [ ] Allows editing name, address, notes, and “Order in route”.
  - [ ] Saving:
    - [ ] Updates fields and reorders the route using the given order number.
    - [ ] Moving to a different route appends to that route and remains consistent after reload.

**Planned automated tests**
- [ ] Component tests for `RoutePlannerComponent` covering:
  - [ ] Adding a delivery and verifying it appears in the correct position.
  - [ ] Editing and reordering via “Order in route”.
- [ ] Unit tests for `StorageService.saveSortOrder` and `addDelivery` (dense `sortIndex` / `deliveryOrder`).

---

## 3. Planner Hidden Menu – One‑Off Donation & Delivery

**Code:**  
- Planner component hidden actions: `route-planner.component.html/ts`  
- Donation controls: `src/app/components/donation-controls.component.*`  
- Stop card (shared with run/off‑schedule): `src/app/components/stop-delivery-card.component.*`  
- Storage: `oneOffDonations`, `oneOffDeliveries` in `Delivery` model and related logic in `StorageService`

**Behaviors to verify**
- [ ] Swipe or tap reveals hidden menu (Reset / Edit / Skip plus Donation/Delivery row).
- [ ] Opening hidden Donation:
  - [ ] Shows a donation UI matching the run card’s donation layout.
  - [ ] Defaults suggested amount based on dozens and the global suggested rate.
  - [ ] “Save” records a one‑off donation for that person with current datetime without changing run status.
- [ ] Opening hidden Delivery:
  - [ ] Shows the same delivery card layout as the Run page (shared component).
  - [ ] Allows adjusting quantity and donation for a one‑off delivery.
  - [ ] “Save” records a one‑off delivery entry (dozens + donation + date) without changing run status.
- [ ] One‑off donations and deliveries:
  - [ ] Are included in the totals card in the Donation modal (Total Donations / Total Dozen).
  - [ ] Are included in the exported per‑person totals columns.

**Planned automated tests**
- [ ] Component tests for `RoutePlannerComponent`:
  - [ ] Clicking Donation opens the modal and initializes `donationDraft` and totals correctly.
  - [ ] Clicking Delivery opens the off‑schedule modal and initializes `offDonationDraft` and `offDeliveredQty`.
  - [ ] Saving each calls the expected `StorageService` methods and does **not** call `markDelivered`/`markSkipped`.
- [ ] Unit tests for total calculation helpers (if extracted) or `StorageService` helper that aggregates one‑offs + run data.

---

## 4. Run Page – Delivery Flow & Donation

**Code:**  
- Run component: `src/app/pages/delivery-run.component.ts/html/scss`  
- Shared stop card: `stop-delivery-card.component.*`  
- Shared donation controls: `donation-controls.component.*`  
- Storage: `StorageService.markDelivered`, `markSkipped`, `computeChangeStatus`

**Behaviors to verify**
- [ ] Current stop card shows:
  - [ ] Name, address, quantity (dozen) with +/- controls.
  - [ ] Status pill consistent with Planner (Pending / Delivered / Skipped / Changed / Unsubscribed).
  - [ ] Donation section with:
    - [ ] No Donation, Cash, ACH, Venmo, PayPal, Other buttons.
    - [ ] Suggested amount per dozen using the global suggested rate.
    - [ ] Picker/qty-style control for donation amount.
- [ ] Quantity + donation interactions:
  - [ ] Changing qty or donation type/amount changes status to “Changed”.
  - [ ] Reverting all three (qty, type, amount) to original values returns status to “Pending”.
- [ ] Donation button behavior:
  - [ ] Buttons toggle on/off as intended (Run card can clear the selection).
  - [ ] Reset for a stop resets qty and donation back to original but respects unsubscribed state.
- [ ] Deliver/Skip actions:
  - [ ] Deliver marks status `'delivered'`, sets `deliveredDozens`, sets donation date, and advances to next stop.
  - [ ] Skip marks status `'skipped'` with reason and advances, and progress header updates (N/M delivered, N skipped).

**Planned automated tests**
- [ ] Component tests for `StopDeliveryCardComponent`:
  - [ ] Status transitions when qty/donation change and revert.
  - [ ] Donation type toggle behavior (on/off).
- [ ] Component tests for `DeliveryRunComponent`:
  - [ ] Deliver and Skip update route stats and header progress correctly.

---

## 5. Unsubscribe / Resubscribe & Status Pills

**Code:**  
- Planner inline edit + hidden menu: `route-planner.component.*`  
- Run card and Planner pills: `delivery-run.component.html/scss`, `stop-delivery-card.component.html/scss`  
- Storage: `StorageService.resetDelivery`, `resetRoute`, `markSkipped`

**Behaviors to verify**
- [ ] Unsubscribing a person:
  - [ ] Sets `subscribed = false`, `status = 'skipped'`, and `skippedReason` containing “unsubscribed”.
  - [ ] Moves them to the end of the route.
  - [ ] Status pill shows “Unsubscribed” on both Planner and Run.
- [ ] Resubscribing:
  - [ ] Clears `skippedReason` and resets status to pending (if no other changes).
  - [ ] Allows them to appear in route progress again.
- [ ] Reset (route or individual):
  - [ ] Does not resubscribe unsubscribed customers.
  - [ ] Uses `originalDozens` and original donation as baseline.
- [ ] Header progress and route stats:
  - [ ] Exclude unsubscribed stops from the total and delivered counts.
  - [ ] Show skipped counts separately (N skipped) in the header.

**Planned automated tests**
- [ ] Unit tests for `resetDelivery` / `resetRoute` on unsubscribed vs subscribed rows.
- [ ] Component tests verifying pill text and colors for all statuses across Planner and Run.

---

## 6. Ordering, Drag & Swipe

**Code:**  
- Planner drag + swipe: `route-planner.component.ts/html/scss` (CDK DragDrop, swipe handlers)

**Behaviors to verify**
- [ ] Drag handle:
  - [ ] Only the handle (≡) reorders; other parts of the row do not start drag.
  - [ ] Drag target is large enough on mobile (as currently sized).
- [ ] Swipe to reveal hidden menu:
  - [ ] Horizontal swipes (with slight vertical movement) reliably open/close the hidden menu.
  - [ ] Vertical scrolling is still usable and not blocked by swipe when movement is clearly vertical.
  - [ ] Only one row’s hidden menu is open at a time.

**Planned automated tests**
- (Gesture behavior is hard to automate reliably across browsers; treat this as a manual regression checklist for now.)

---

## 7. Export CSV & Totals

**Code:**  
- Backup/export service and helpers: `BackupService` and CSV formatting logic  
- Storage: uses `Delivery` records, including `donation`, `oneOffDonations`, `oneOffDeliveries`

**Behaviors to verify**
- [ ] Exported CSV:
  - [ ] Contains original columns + new appended columns for current run state and totals.
  - [ ] For each person, “Total Donations” and “Total Dozen” reflect:
    - [ ] All completed run deliveries.
    - [ ] All one‑off deliveries and donations via hidden menu.
  - [ ] Fields that are not used by the app are still round‑tripped unchanged.

**Planned automated tests**
- [ ] Unit tests around the CSV writer using a small synthetic dataset that includes:
  - [ ] Multiple runs.
  - [ ] Unsubscribed stops.
  - [ ] Mixture of one‑off and run‑delivered donations.

---

## 8. PWA & UX Specific Behaviors (Manual)

**Code:**  
- App shell: `src/app/app.component.*`, `src/styles.scss`  
- Wake lock: `HomeComponent.toggleWakeLock`  
- Dark mode: global theme (`[data-theme='dark']`) + page‑level SCSS  
- PWA config: `public/manifest.webmanifest`, service worker config

**Behaviors to verify manually**
- [ ] iOS PWA:
  - [ ] Button “pressed” states do not linger after touch release (hover effectively disabled on touch).
  - [ ] Swipe gestures on Planner work without fighting scroll.
  - [ ] Dynamic Island / status bar background matches the app background in both light and dark mode.
  - [ ] App icon and splash use the correct assets.
- [ ] “Keep screen awake”:
  - [ ] When ON, screen doesn’t auto‑sleep while the app is in foreground.
  - [ ] State is persisted and reflected correctly on Home.
- [ ] Dark mode:
  - [ ] Applies consistently across Home, Planner, Run, modals, chips, qty controls, pills, and hidden menus.
  - [ ] Hover/focus colors remain readable in dark mode.

---

## 9. How to Use This Document

- Treat each bullet as either:
  - A **manual regression step** you can walk through on device (especially PWA and gestures), or
  - A **candidate test case** to codify in unit/component tests.
- As tests are implemented, update the checkboxes and, if helpful, link to specific spec files (e.g., `storage.service.spec.ts`, `route-planner.component.spec.ts`).

---

## 10. Backlog / Tech Debt

- [ ] Add a Dexie **compound index** on `deliveries` for `[routeDate+status]` to remove the “would benefit from a compound index [routeDate+status]” warnings and keep route/status queries fast as the dataset grows.
- [ ] Add a simple **“How this app works”** help/readme view (linked from Home) that explains import/backup/run behavior, instead of relying on inline instructional text in the Home header.
