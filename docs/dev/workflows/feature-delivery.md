# Feature Delivery Workflow

Use this workflow to deliver a feature tracked by a parent issue and child issues, from branch creation through PR.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-22
- **Type**: How-to
- **Scope**: feature delivery from issue breakdown to PR
- **Non-goals**: issue creation/triage, release and deployment
- **Applies to**: GitHub issues and feature branches

## Trigger

- A parent feature issue exists with child issues.
- You are ready to start implementation.

## Inputs

- Parent issue number or URL.
- Base branch if it is not the repo default.
- Optional preferred order for child issues.
- Shorthand: `feature start {issue}` maps to `/feature action=start issue={issue}`.

## Constraints

- Use `.github/prompts/feature.prompt.md` as the primary workflow driver.
- Follow branch naming rules in `.github/prompts/branch.prompt.md`.
- Keep child issues and the parent checklist updated as work completes.
- If child issues are missing, use `/issues action=breakdown` to create them.
- Run quality checks per `docs/dev/workflows/quality.md` before opening a PR.

## Steps

1. Start the feature workflow:
   - Run `/feature action=start issue={parent}` or `feature start {parent}`.
   - Confirm the branch name and ordered child issues.
2. Implement each child issue:
   - Run `/feature action=next` or `feature next` to select the next issue.
   - Complete acceptance criteria, update docs, and close the issue.
   - Update the parent checklist safely; if tooling is missing, leave a progress comment instead of editing the body.
3. Capture process learnings:
   - Update prompts/workflows and the prompt catalog when you discover gaps or hazards.
4. Keep the branch current:
   - Use `/branch action=sync` as needed.
5. Finish the feature:
   - Run `/feature action=finish` or `feature finish`.
   - Open a PR linked to the parent issue.
6. Cleanup after merge:
   - Ensure the feature branch is deleted (auto-delete or `/branch action=delete name={branch}`).
   - Prune refs with `git fetch --prune` and switch back to `main`.

## Checks

- Branch is created and linked to the parent issue.
- All child issues are closed or explicitly deferred.
- Parent issue checklist reflects completion.
- PR includes `Fixes #{parent}` in the description.
- Feature branch is deleted and local refs are pruned.
- Prompt/workflow updates are recorded when new lessons are learned.

## Outputs

- Feature branch with all changes implemented.
- Parent issue updated or closed.
- PR ready for review.

## Related docs

- `.github/prompts/feature.prompt.md`
- `.github/prompts/issues.prompt.md`
- `.github/prompts/branch.prompt.md`
- `.github/prompts/pr.prompt.md`
- `docs/dev/workflows/quality.md`
