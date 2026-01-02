# Feature Delivery Workflow

Use this workflow to deliver a feature tracked by a parent issue and child issues, from branch creation through PR.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-02
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
- Commit each child issue’s changes before moving to the next one.
- Do not push the feature branch until the parent feature is complete unless the user explicitly asks.
- If child issues are missing, use `/issues action=breakdown` to create them.
- Use the docs prompt and documentation style guide when updating docs.
- Run quality checks per `docs/dev/workflows/quality.md` before opening a PR.
- If tests are known failing, skip them only with an explicit PR note and a follow-up issue.
- Confirm branch protection and rulesets for `main` before merging so required checks match available CI.
- Warn the user and get explicit confirmation before any high-risk action (history rewrites, force pushes, repo settings changes, mass deletions, destructive resets, data purges).
- Before switching branches or starting the feature, confirm the working tree is clean or ask the user how to handle existing changes.

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
   - If behavior changes, run `testing scope` to select regression packs, execute automated/manual checks, record TP-xx IDs, and update/add tests (or log a follow-up issue).
   - Use `/docs` (`doc: align` / `doc: guide`) for any doc updates tied to the issue.
   - Run at least one base check (default: `npm run build`) and note results. Fix any errors before closing the child issue.
   - If `public/build-info.json` changes, restore it before committing.
   - Commit the child issue work before moving to the next child issue.
   - Update the parent checklist safely; if tooling is missing, leave a progress comment instead of editing the body.
3. Retrospective (per feature):
   - Capture what worked, what hurt, and the next improvement in the parent issue or PR.
   - Update prompts/workflows and the prompt catalog when you discover gaps or hazards.
4. Apply retrospective learnings:
   - Review retrospective comments on the parent issue and recent feature parents.
   - Address low-effort fixes immediately; create follow-up issues for larger work.
5. Keep the branch current:
   - Use `/branch action=sync` as needed.
6. Finish the feature:
   - Run `/feature action=finish` or `feature finish`.
   - Run the required regression packs (per `docs/testing/regression-tests.md`) and record TP-xx IDs; update regression docs if new behavior was added.
   - Push the feature branch now (only after all child issues are complete).
   - Open a PR linked to the parent issue.
   - Verify the PR includes the Review Evidence section; if missing, stop and update the PR before merge.
   - Perform a code review using `pr review` and `docs/dev/workflows/code-review.md`, then document it via a formal GitHub review (approve/request changes).
     - Include evidence: acceptance criteria coverage, tests/TP-xx packs, and known gaps.
   - Confirm branch protection/rulesets won’t block the merge and note any skipped checks in the PR.
   - Cross-check parent acceptance criteria against child outcomes and mark parent checklist items complete when satisfied.
7. Cleanup after merge:
   - Ensure the feature branch is deleted (auto-delete or `/branch action=delete name={branch}`).
   - Prune refs with `git fetch --prune` and switch back to `main`.

## Checks

- Branch is created and linked to the parent issue.
- All child issues are closed or explicitly deferred.
- Parent issue checklist reflects completion.
- Issue plans reviewed and approved before implementation.
- PR includes `Fixes #{parent}` in the description.
- PR includes Review Evidence content (AC coverage, tests, TP-xx packs, manual checks, risks/gaps).
- Branch protection/ruleset requirements are understood and satisfied.
- Testing status is documented when checks are skipped.
- Testing workflow used for behavior changes, with pack IDs recorded.
- Regression pack updates were considered for behavior changes, and TP-xx IDs were recorded before the PR.
- Code review results are documented in the PR.
- Feature branch is deleted and local refs are pruned.
- Retrospective notes and prompt/workflow updates are recorded when new lessons are learned.
- Retrospective follow-ups are applied or tracked in new issues.
- Base checks run for each child issue; full quality run before PR.
- Child issues are closed only after base checks pass.
- Feature branch is pushed only at finish unless explicitly requested earlier.
- High-risk actions were confirmed explicitly before execution.
- Working tree state was confirmed before switching workstreams.
- Each child issue was committed before starting the next one.

## Outputs

- Feature branch with all changes implemented.
- Parent issue updated or closed.
- PR ready for review.
- Retrospective notes captured for the feature.

## What changed / Why

- Added explicit development workflow plan checks to keep issue plans feasible before coding.
- Recorded plan review as a checklist item so it is tracked alongside delivery steps.
- Added docs prompt guidance to keep documentation updates consistent with the style guide.
- Added testing workflow integration so behavior changes include pack selection and test updates.
- Added a retrospective follow-up step so learnings are applied or tracked.
- Added explicit confirmation requirement for high-risk actions.
- Added a worktree cleanliness confirmation step before switching tasks.
- Added guidance to commit each child issue before moving on to keep the feature branch clean.
- Required code reviews to be documented as part of feature finish.

## Related docs

- `.github/prompts/feature.prompt.md`
- `.github/prompts/issues.prompt.md`
- `.github/prompts/branch.prompt.md`
- `.github/prompts/docs.prompt.md`
- `.github/prompts/pr.prompt.md`
- `docs/dev/workflows/code-review.md`
- `.github/prompts/testing.prompt.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `docs/dev/workflows/testing.md`
- `docs/dev/workflows/quality.md`
