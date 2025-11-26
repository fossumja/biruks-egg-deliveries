## Screen & Component Inventory (Styling Refactor Prep)

This document captures what exists today so we can safely refactor UI per the style guide.

### Screens
- **Home (home.component)**: CSV import/export, route selection, start/continue route, backup now, routes summary list.
- **Route Planner (route-planner.component)**: Lists stops for the selected route/run, drag-and-drop reordering, per-stop skip/reset, planned dozens adjust, donation pill/details overlay, amount picker overlay.
- **Delivery Run (delivery-run.component)**: Current stop card with address/notes, delivered/skip actions, delivered dozens adjust, donation section + amount picker, skip reason overlay, progress.

### Shared/Supporting
- **Services**: `StorageService` (Dexie), `BackupService`, donation/default helpers, import state persistence; models for Delivery, BaseStop, DeliveryRun, CSV import state.
- **Components**: `DonationAmountPickerComponent`.
- **Assets/Manifest**: PWA manifest, icons in `public/icons/`.

### Styling State
- Styles are mostly component-scoped; tokens/utilities not yet centralized. App shell/header not yet aligned with the new style guide. Buttons/cards are ad hoc per component.

### Test Coverage (current)
- No E2E/smoke tests present. Needs a happy-path smoke (import CSV → start route → deliver/skip).

### Next Steps for Phase 1
- Add global tokens/utilities in `styles.scss` (colors, typography, spacing, cards, buttons).
- Introduce app shell/container wrapping router-outlet.
- Add safe-area helpers.
