# Quality Workflow

Use this workflow to run and document quality gates (format, lint, typecheck, tests) before shipping changes.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-22
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
3. If running fixes:
   - Apply fixes in the same order (format → lint → types → tests).
4. Re-run checks to confirm green.

## Checks

- Formatting pass or no formatting drift.
- Lint passes with no errors.
- Typecheck passes (if configured).
- Tests pass (or documented reason if skipped).

## Outputs

- A short summary of what was run and the results.
- Follow-up tasks if any gate cannot be made green.

## Related docs

- `.github/prompts/quality.prompt.md`
- `docs/dev/workflows/testing.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `docs/dev/workflows/docs.md`
