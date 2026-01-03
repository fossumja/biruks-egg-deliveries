# Quality Workflow

Use this workflow to run and document quality gates (format, lint, typecheck, tests) before shipping changes.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-03
- **Type**: How-to
- **Scope**: code quality checks for this repo
- **Non-goals**: introducing new tooling without explicit approval
- **Applies to**: `src/` and any repo changes that affect build/test

## Trigger

- Before shipping or releasing changes.
- After significant refactors or dependency updates.

## Inputs

- Intended action: check-only or fix (if tools support autofix).
- The set of files/areas that changed.

## Constraints

- Prefer existing scripts in `package.json`.
- Do not add new linters/formatters unless requested.
- If a best practice changes, confirm it first, then update the relevant best-practices doc.
- Prefer the quality prompt (`/quality`) to run checks consistently.

## Steps

1. Review available scripts:
   - Check `package.json` for `lint`, `format`, `test`, and `build`.
2. Run quality gates in order:
   - Formatting check (if present).
   - Lint.
   - Typecheck (if separate).
   - Tests.
     - Prefer `npm run test:ci` when you need artifacts. It writes `test-results/junit.xml` and `coverage/` (`coverage/index.html`, `coverage/lcov.info`). Use `npm test` for interactive runs.
3. If a PR is open for the work:
   - Confirm the PR includes a Review Evidence section (AC coverage, tests, TP-xx packs, manual checks, risks/gaps).
   - Confirm the PR body validation check passes (Traceability, Validation sign-off, Automated specs updated).
     - Traceability table has at least one filled row (not placeholders).
     - Validation sign-off checkbox is checked.
     - Automated specs updated lists spec paths or `N/A` for docs-only changes.
   - If missing, stop and update the PR before merge.
   - If the PR-body check is required but needs a waiver, document the waiver in the PR with reason and approval.
4. If running fixes:
   - Apply fixes in the same order (format → lint → types → tests).
5. Re-run checks to confirm green.

## Checks

- Formatting pass or no formatting drift.
- Lint passes with no errors.
- Typecheck passes (if configured).
- Tests pass (or documented reason if skipped).
- PR Review Evidence section present before merge.
- PR body validation check passes when enabled in CI.

## Outputs

- A short summary of what was run and the results.
- Artifact locations when `npm run test:ci` is used (JUnit and coverage).
- Follow-up tasks if any gate cannot be made green.

## What changed / Why

- Documented the CI test command and artifact paths for test reporting.
- Added PR body validation check guidance for V-model evidence enforcement.

## Related docs

- `.github/prompts/quality.prompt.md`
- `docs/dev/workflows/testing.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `docs/dev/workflows/docs.md`
