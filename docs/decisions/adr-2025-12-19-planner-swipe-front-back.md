# ADR-2025-12-19 - Planner swipe front/back cards

Refactors planner rows to front/back swipe cards so actions remain clickable and conflicts are eliminated. Simplifies swipe logic with explicit open/close behavior.

- **Status**: Stable
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Explanation
- **Scope**: planner swipe interaction model
- **Non-goals**: new gesture libraries or broader UI redesigns
- **Applies to**: `src/app/**`

## Context

- The Planner swipe menu currently suffers from pointer and z-index conflicts, making actions unreliable.
- We need a clear closed/open state with reliable click targets on the back actions.
- Swipe logic should be reusable and easy to maintain.

## Decision

- Refactor planner rows to explicit front/back card layers in a swipe container.
- Translate the front card on open; back card remains stationary and clickable.
- Disable front-card interactions while open to prevent click conflicts.
- Simplify swipe handlers with direction locking and a single open/close threshold.
- Close the swipe state before executing any back-card action.

## Alternatives considered

- Keep the current DOM structure and tune z-index and pointer rules.
- Use an overlay action bar instead of a back card.
- Adopt a third-party swipe library.

## Consequences

- Requires template and SCSS refactors in the Planner.
- Swipe handlers are simpler and more reliable across mouse and touch input.
- Back actions become consistent and easier to test.

## Follow-ups

- Implement the front/back card structure and swipe logic updates.
- Validate behavior on mobile PWA and desktop drag.
- Ensure archived runs keep the swipe actions disabled.
