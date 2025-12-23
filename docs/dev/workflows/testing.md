# Testing Workflow

Use this workflow to run reliable, scoped testing with modular test packs.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-22
- **Type**: How-to
- **Scope**: selecting and executing regression packs for this app
- **Non-goals**: changing test tooling or adding new frameworks
- **Applies to**: `src/app/**`, `src/testing/**`, `public/**`

## Overview

This workflow helps you select the right test packs for a change, run automated checks, and complete the manual regression steps that cannot be automated yet.

## When to use

- Before opening a PR that changes core app behavior.
- After changes to storage, import/export, or run history.
- Before a release or a seasonal rollout.

## When not to use

- Documentation-only changes.
- Changes confined to static assets with no behavior impact.

## Prerequisites

- Local repo setup is working.
- Test fixtures available in `src/testing/fixtures/`.
- You can run `ng test` locally.

## Inputs

- Change summary or file list.
- Target environment (local, CI, device).
- Release intent (targeted vs full regression).

## Constraints

- Use the test pack catalog in `docs/testing/regression-tests.md`.
- Follow `docs/dev/best-practices/testing-practices.md`.
- Do not introduce new tooling unless explicitly requested.
- Record what you ran and the results.

## Steps

1. Identify the scope of the change.
2. Map changes to packs using the change-impact map.
3. Choose a test tier:

  - Smoke: quick validation for low-risk changes.
  - Targeted: only packs impacted by the change.
  - Full regression: all packs, plus usage scenarios.

4. Run automated checks:

```bash
npm test
```

For targeted specs, use Angular's include filter:

```bash
ng test --include='**/storage.service.spec.ts'
```

5. Run the manual checks listed in each selected pack.
6. If required, execute the usage scenarios in `docs/testing/usage-scenario-tests.md`.
7. Record results and update docs when coverage changes.

## Outcomes

- Selected packs executed with recorded results.
- Any failures documented with follow-up issues.
- Regression plan updated when coverage changes.

## Troubleshooting

- If tests are flaky, clear IndexedDB and rerun the spec.
- If tests are slow, run only the impacted spec files.
- If a pack is missing, update `docs/testing/regression-tests.md` first.

## Related docs

- `docs/testing/regression-tests.md`
- `docs/testing/usage-scenario-tests.md`
- `docs/dev/best-practices/testing-practices.md`
- `.github/prompts/testing.prompt.md`
- `docs/dev/workflows/quality.md`
