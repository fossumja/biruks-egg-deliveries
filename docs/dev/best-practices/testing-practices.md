# Testing Practices

This document defines how we test the app and what coverage we prioritize. Use it alongside the regression and scenario test plans.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: unit, integration, component, and scenario testing practices
- **Non-goals**: detailed test cases or framework selection changes
- **Applies to**: `src/app/**`, `src/testing/**`

## Goals

- Protect delivery-day workflows and CSV export accuracy.
- Keep tests fast, deterministic, and focused on real user behavior.
- Prefer scenario coverage that mirrors actual delivery runs.

## Test layers (priority order)

1. Data and service tests
2. Component tests
3. Scenario tests (manual now, automated over time)
4. Optional end-to-end tests

### Data and service tests

- Focus on `StorageService`, CSV import/export, and data shaping helpers.
- Favor integration-style tests that exercise Dexie + storage flows together.
- Use in-memory or isolated test databases and clean up after each spec.

### Component tests

- Cover Planner and Run page behaviors that drive storage updates.
- Validate status transitions, quantity changes, and donation logic.
- Mock services at the boundary and assert calls plus local state changes.

### Scenario tests

- Follow `docs/testing/usage-scenario-tests.md` and `docs/testing/regression-tests.md`.
- Keep manual scenarios up to date as features change.
- Automate scenarios when they stabilize, starting with data-level runners.

### Optional end-to-end tests

- Add E2E coverage only when it adds unique confidence beyond component tests.
- Keep E2E flows small and focused on import, run, and export happy paths.

## What to test first

- CSV import validation and column preservation.
- CSV export totals and ordering.
- Route ordering and drag-and-drop behaviors.
- Delivery status transitions (Pending, Delivered, Skipped, Changed, Unsubscribed).
- One-off donations and deliveries from the Planner hidden menu.
- Backup and restore flows.

## Test data and fixtures

- Use small, deterministic fixtures with anonymized customer data.
- Keep fixtures in `src/testing/fixtures/` and reuse them across specs.
- Avoid real dates and random values. Inject time and IDs when needed.

## Conventions

- Use `*.spec.ts` naming and place specs near the code they cover.
- Keep each test focused on one behavior.
- Prefer explicit assertions over snapshot-style checks.
- If a bug fix ships, add a regression test that fails without the fix.

## Tooling

- Default runner: `ng test` with Karma + Jasmine.
- If tooling changes, update this doc and `docs/dev/workflows/quality.md`.

## Documentation updates

- When tests are added or retired, update:
  - `docs/testing/regression-tests.md`
  - `docs/testing/usage-scenario-tests.md`
- When a testing standard changes, update this doc before applying it elsewhere.

## Related docs

- `docs/testing/regression-tests.md`
- `docs/testing/usage-scenario-tests.md`
- `docs/dev/workflows/quality.md`
- `docs/dev/best-practices/angular-standards.md`
- `docs/dev/best-practices/typescript-standards.md`
- `docs/dev/best-practices/accessibility.md`
