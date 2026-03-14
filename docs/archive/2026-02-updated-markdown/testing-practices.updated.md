# Testing practices

- **Status**: Stable
- **Owner**: (set per-repo)
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: test layering and practical priorities for this repo
- **Applies to**: unit/integration/scenario tests
- **Non-goals**: detailed test harness setup (tracked in workflows)

## Current repo baseline

- Current stack: **Karma + Jasmine** (legacy default for many Angular projects).
- Best-practice note: recent Angular guidance and tooling trends have moved toward faster runners (example: **Vitest**) for unit tests. Treat a future migration as desirable, but do not churn tests without a clear payoff.

Reference: [Angular testing guide](https://angular.dev/guide/testing).

## Testing layers

### Unit tests (fast, isolated)
Reference: [Angular testing guide](https://angular.dev/guide/testing)

Use unit tests for:

- Pure functions and utilities
- Signal computations (`computed`) and reducers/pure update functions
- Component logic with minimal DOM involvement

Rules:

- Prefer deterministic tests with no timers/network.
- Avoid testing Angular internals; test observable outputs and user-visible state.

### Integration tests (component + template + dependencies)
Reference: [Angular testing guide](https://angular.dev/guide/testing)

Use integration tests for:

- Components with templates, bindings, and DOM behavior
- Form validation and error rendering
- Routing behavior within a feature (where practical)

Rules:

- Prefer realistic usage: interact with the DOM, not private methods.
- Use stable selectors (data attributes) for querying DOM in tests.

### Scenario/E2E tests (business-critical flows)
Reference: [Angular testing guide](https://angular.dev/guide/testing)

Use scenario tests sparingly for:

- The most business-critical paths (CSV import/export, delivery entry, backups)
- Regression coverage across multiple components and routes

Rules:

- Keep scenario tests few and high value.
- Treat scenario tests as “smoke + critical workflows,” not exhaustive UI testing.

## Do / Don’t

- **Do** test the highest-risk logic where a bug would lose data or block deliveries.
- **Do** bias toward unit and integration tests for speed and stability.
- **Do** make flaky tests a priority-1 fix (or delete if not valuable).
- **Don’t** over-mock everything; prefer simple fakes and real templates.
- **Don’t** duplicate the same assertion across many tests.

## Angular-specific guidance

### Signals

- Test signal-driven state as pure data transformations.
- Avoid writing tests that depend on effect ordering unless the behavior is part of the spec.

Reference: [Signals](https://angular.dev/guide/signals).

### Routing

- Prefer route configuration tests at the feature boundary.
- Keep router tests focused on navigation outcomes (route activated, redirects, guards).

Reference: [Routing](https://angular.dev/guide/routing).

## Common pitfalls

- Writing tests that assert implementation details rather than behavior.
- Snapshot-heavy tests that churn on unrelated UI changes.
- Flaky async tests (missing awaits, timeouts, or uncontrolled timers).
- Overusing TestBed configuration in every test file instead of shared helpers.

## Version watchlist

Update this doc when any of the following change:

- Angular CLI default test runner guidance changes.
- The repo migrates from Karma/Jasmine to a different runner.
- New Angular features require new test patterns (example: new SSR/hydration defaults).

References: [Angular testing guide](https://angular.dev/guide/testing), [Angular releases policy](https://angular.dev/reference/releases).
