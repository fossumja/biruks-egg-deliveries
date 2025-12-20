# Swipe Front/Back Card Plan

Archived plan for the planner swipe front/back card refactor. Superseded by `docs/decisions/adr-2025-12-19-planner-swipe-front-back.md` and `docs/ux/ux-overview.md`.

- **Status**: Deprecated
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: How-to
- **Scope**: swipe card structure and gesture behavior in the planner
- **Non-goals**: full implementation details or UX styling changes
- **Applies to**: `src/app/pages/route-planner.component.*`

## Replacement

- `docs/decisions/adr-2025-12-19-planner-swipe-front-back.md`
- `docs/ux/ux-overview.md`

## Goals
- Explicit front/back card layers for each stop.
- Smooth swipe with clear states (closed, open) and reliable click targets.
- Back-card actions clickable; after click, front card slides back and dialog opens.
- Simplified, reusable swipe logic; no lingering merge/z-index issues.

## Current State
- Front card: `.planner-row-content`; back actions: `.planner-swipe-actions` in `route-planner.component.html/.scss`.
- Swipe logic in `RoutePlannerComponent` (`startSwipe/moveSwipe/endSwipe`, `getRowTransform`, `openRowId`).
- Click reliability has been affected by pointer/z-index conflicts.

## TODOs
- [ ] Refactor template to explicit front/back wrappers per stop:
  - `<div class="planner-swipe-row">`
    - `<div class="back-card">` hidden menu buttons `</div>`
    - `<div class="front-card">` main stop content `</div>`
    - `</div>`
- [ ] Style layers:
  - Back card: full size, visible background, button spacing.
  - Front card: shadow/border, higher z-index, transition on translateX.
  - Open state: front card translated left; back card accepts clicks; front card ignores clicks.
- [ ] Simplify swipe handlers:
  - Pointer down: record start.
  - Pointer move: lock to swipe only if horizontal delta wins; preventDefault when locked.
  - Pointer up: open if past threshold; otherwise close.
  - Preserve threshold/distance constants.
- [ ] Ensure actions close the swipe before running:
  - Back-card button click: set `openRowId = null`, then run action (open donation/off-schedule modal, etc.).
  - Front-card click when open: closes.
- [ ] Test scenarios:
  - Desktop drag/mouse.
  - Mobile touch (PWA and browser).
  - Vertical scroll without accidental open.
  - Actions fire on live route; disabled appropriately on past runs/All receipts.
- [ ] Cleanup: remove any leftover z-index/pointer conflicts or merge artifacts.

## Nice-to-haves (optional)
- Add a slight snap animation (150–200ms ease-out).
- Document the swipe constants (distance/threshold) inline for future tuning.
