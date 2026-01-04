# Testing Workflow

Use this workflow to run reliable, scoped testing with modular test packs.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-04
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
- You can run `npm test` locally.

## Inputs

- Change summary or file list.
- Target environment (local, CI, device).
- Release intent (targeted vs full regression).

## Constraints

- Use the test pack catalog in `docs/testing/regression-tests.md`.
- Follow `docs/dev/best-practices/testing-practices.md`.
- Do not introduce new tooling unless explicitly requested.
- Use pack IDs (TP-xx) in all reporting.
- Record what you ran and the results.
- When behavior changes or new UI flows are added, review whether regression packs or usage scenarios need updates; update `docs/testing/regression-tests.md` and `docs/testing/usage-scenario-tests.md` as needed.
- Automated coverage is required for any new or changed behavior unless explicitly deferred with a follow-up issue and documented rationale.
- For UI changes, add or update component specs that assert the new behavior and data display.
- For data logic changes, add or update service/util tests that validate calculations and edge cases.
- Require a change-impact summary (flows, files, automation, TP-xx packs) in the issue before executing packs.
- When multiple repos are active, confirm repo ID + name, `cwd`, and `git remote -v` before mutating actions (issue edits, PR updates).

## Steps

1. Identify the scope of the change.
2. Map changes to packs using the change-impact map and list the TP-xx IDs (or run `testing scope` to confirm).
3. Ensure the issue includes a change-impact summary (flows, files, automation, TP-xx packs); add it if missing.
4. Document the test plan in the issue:
   - Required automated specs.
   - TP-xx packs and manual checks.
   - Mark the test plan approved before implementation (self-approval is fine for solo work).
   - Use `testing plan` to draft and write the test plan into the issue when needed.
5. Enumerate the automated specs that must be added or updated for the change (components + services).
6. Add/extend the automated tests before running the final regression checks.
7. Choose a test tier:

  - Smoke: quick validation for low-risk changes.
  - Targeted: only packs impacted by the change.
  - Full regression: all packs, plus usage scenarios.

8. Run automated checks:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

For targeted specs, use Angular's include filter:

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include src/app/services/storage.service.spec.ts
```

For CI-friendly artifacts, run:

```bash
npm run test:ci
```

This writes a JUnit report to `test-results/junit.xml` and coverage outputs to `coverage/` (`coverage/index.html` and `coverage/lcov.info`). Open `coverage/index.html` to view the HTML report; use the JUnit file in CI.

9. Run the manual checks listed in each selected pack.
10. If required, execute the usage scenarios in `docs/testing/usage-scenario-tests.md`.
11. Record results and update docs when coverage changes. Include:

  - Pack IDs and tier.
  - Commands executed.
  - Automated specs added/updated.
  - Manual checks completed (or deferred).
  - Failures and follow-up issues.
  - Base check results if automated tests are skipped.

## Outcomes

- Selected packs executed with recorded results.
- Any failures documented with follow-up issues.
- Regression plan updated when coverage changes.
- Regression pack updates are considered for every behavior change (or explicitly deferred with a follow-up issue).
- Test plan documented and approved before implementation.

## Troubleshooting

- If tests are flaky, clear IndexedDB and rerun the spec.
- If tests are slow, run only the impacted spec files.
- If a pack is missing, update `docs/testing/regression-tests.md` first.
- If Karma cannot bind to a local port in a sandboxed environment, rerun with escalated permissions.
- If tests cannot be executed, document the gap and open a follow-up issue.
- If Karma cannot run at all, run `npm run build` as a base check and note the deferral.

## What changed / Why

- Added sandbox troubleshooting guidance for Karma port binding failures.
- Added base-check guidance when automated tests are deferred.
- Documented the CI test command and artifact paths for JUnit and coverage outputs.
- Added a test-plan approval gate and explicit automated spec listing for V-model traceability.
- Added guidance to draft the issue test plan via the testing prompt.
- Added a change-impact summary requirement before selecting packs.

## Related docs

- `docs/testing/regression-tests.md`
- `docs/testing/usage-scenario-tests.md`
- `docs/dev/best-practices/testing-practices.md`
- `.github/prompts/testing.prompt.md`
- `docs/dev/workflows/quality.md`
