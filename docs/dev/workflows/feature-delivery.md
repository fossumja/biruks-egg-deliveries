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
- Use the development workflow to validate each issue plan before implementation.
- Keep child issues and the parent checklist updated as work completes.
- If child issues are missing, use `/issues action=breakdown` to create them.
- Run quality checks per `docs/dev/workflows/quality.md` before opening a PR.
- If tests are known failing, skip them only with an explicit PR note and a follow-up issue.
- Confirm branch protection and rulesets for `main` before merging so required checks match available CI.

## Branch Protection (One-Time Setup)

Use this once per repo to keep `main` safe without blocking work.

1. Go to GitHub → Settings → Rules → Rulesets → New ruleset.
2. Target `main` only.
3. Enable:
   - Require pull requests before merging.
   - Block force pushes.
   - Block branch deletion.
4. Optional when the team is ready:
   - Require 1 approval and resolve conversations.
5. Do **not** require status checks until CI is stable, or merges will be blocked.

## Steps

1. Start the feature workflow:
   - Run `/feature action=start issue={parent}` or `feature start {parent}`.
   - Confirm the branch name and ordered child issues.
   - Validate the parent issue plan per `docs/dev/workflows/development.md` and comment if changes are needed.
2. Implement each child issue:
   - Run `/feature action=next` or `feature next` to select the next issue.
   - Review the issue plan and feasibility per `docs/dev/workflows/development.md` before coding.
   - Complete acceptance criteria, update docs, and close the issue.
   - Run at least one base check (default: `npm run build`) and note results.
   - If `public/build-info.json` changes, restore it before committing.
   - Update the parent checklist safely; if tooling is missing, leave a progress comment instead of editing the body.
3. Retrospective (per feature):
   - Capture what worked, what hurt, and the next improvement in the parent issue or PR.
   - Update prompts/workflows and the prompt catalog when you discover gaps or hazards.
4. Keep the branch current:
   - Use `/branch action=sync` as needed.
5. Finish the feature:
   - Run `/feature action=finish` or `feature finish`.
   - Open a PR linked to the parent issue.
   - Confirm branch protection/rulesets won’t block the merge and note any skipped checks in the PR.
6. Cleanup after merge:
   - Ensure the feature branch is deleted (auto-delete or `/branch action=delete name={branch}`).
   - Prune refs with `git fetch --prune` and switch back to `main`.

## Checks

- Branch is created and linked to the parent issue.
- All child issues are closed or explicitly deferred.
- Parent issue checklist reflects completion.
- Issue plans reviewed and approved before implementation.
- PR includes `Fixes #{parent}` in the description.
- Branch protection/ruleset requirements are understood and satisfied.
- Testing status is documented when checks are skipped.
- Feature branch is deleted and local refs are pruned.
- Retrospective notes and prompt/workflow updates are recorded when new lessons are learned.
- Base checks run for each child issue; full quality run before PR.

## Outputs

- Feature branch with all changes implemented.
- Parent issue updated or closed.
- PR ready for review.
- Retrospective notes captured for the feature.

## What changed / Why

- Added explicit development workflow plan checks to keep issue plans feasible before coding.
- Recorded plan review as a checklist item so it is tracked alongside delivery steps.

## Related docs

- `.github/prompts/feature.prompt.md`
- `.github/prompts/issues.prompt.md`
- `.github/prompts/branch.prompt.md`
- `.github/prompts/pr.prompt.md`
- `docs/dev/workflows/quality.md`
