# Code Review Workflow

Use this workflow to perform and document code reviews with traceable evidence aligned to the V-model.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-04
- **Type**: How-to
- **Scope**: reviewing PRs and documenting verification evidence
- **Non-goals**: replacing CI or enforcing multi-reviewer policies
- **Applies to**: GitHub PRs for changes in this repo

## Overview

Code reviews should show a clear line from requirements to verification. This workflow captures evidence against acceptance criteria, tests, and known risks so the PR history remains auditable.

## When to use

- Before merging any PR that changes behavior, data, or UI.
- When completing a parent feature or release-ready branch.

## Inputs

- PR URL or number.
- Linked issues and acceptance criteria.
- Test evidence (commands run, TP-xx packs, manual checks).

## Constraints

- Follow the review expectations in `.github/prompts/pr.prompt.md`.
- Document evidence against acceptance criteria and test coverage.
- Verify the PR Traceability section is complete and matches executed tests.
- Use TP-xx pack IDs from `docs/testing/regression-tests.md` when applicable.
- Confirm validation/UAT sign-off is recorded when usage scenarios are required.
- If evidence is missing, request changes or note explicit gaps with a follow-up issue.
- For high-risk changes (data migrations, auth, payment, or destructive actions), ask for an additional reviewer.
- For solo-maintainer repos, use a formal self-review comment (GitHub blocks self-approval) and ensure branch protections do not require approvals.

## Steps

1. Gather context:
   - Read the parent issue and linked child issues.
   - List acceptance criteria that must be verified.
   - Review the PR Traceability section for requirement → evidence mapping.
2. Review the diff:
   - Scan code, tests, and docs for alignment with ACs.
   - Check for regressions or cross-feature impacts.
3. Validate test evidence:
   - Confirm automated test commands, TP-xx packs, and manual checks.
   - If evidence is missing, request changes or require a follow-up issue.
4. Record review evidence in the PR:
   - Acceptance criteria coverage (what was verified).
   - Tests run (commands), TP-xx packs, and manual checks.
   - Validation/UAT sign-off with scenario IDs when applicable.
   - Risks/gaps and any deferred verification.
5. Submit a formal review:
   - Use a GitHub review (approve/request changes) or a PR comment.
   - If self-reviewing, leave a formal review summary even when there are no findings.

## Evidence checklist

- Acceptance criteria mapped to code changes.
- Traceability section maps requirements/ACs to evidence and matches tests run.
- Tests updated or added when behavior changes.
- TP-xx pack IDs and manual checks documented.
- Validation/UAT sign-off recorded when usage scenarios are required.
- Risks or gaps captured with follow-up issues when needed.

## Review evidence snippet

```
Review Evidence
- AC coverage: ...
- Tests: ...
- TP-xx packs: ...
- Manual checks: ...
- Traceability: ...
- Risks/gaps: ...
```

## Outputs

- A PR review (approve or request changes) with documented evidence.
- Clear traceability between requirements and verification.

## What changed / Why

- Added an explicit traceability check to align requirements with verification evidence.
- Added validation/UAT sign-off check for usage scenarios.

## Related docs

- `.github/prompts/pr.prompt.md`
- `docs/dev/workflows/feature-delivery.md`
- `docs/testing/regression-tests.md`
- `docs/dev/best-practices/testing-practices.md`
