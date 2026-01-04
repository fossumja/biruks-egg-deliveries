# Feature Delivery Workflow

Use this workflow to deliver a feature tracked by a parent issue and child issues, from branch creation through PR.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-04
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
- Optional: run `feature all {issue}` (feature prompt `action=all`) to auto-detect the stage and chain `feature start` → repeated `feature next` → `feature finish`.

## Constraints

- Use `.github/prompts/feature.prompt.md` as the primary workflow driver.
- Follow branch naming rules in `.github/prompts/branch.prompt.md`.
- Use the development workflow to validate each issue plan before implementation.
- Keep child issues and the parent checklist updated as work completes.
- Commit each child issue’s changes before moving to the next one.
- Do not push the feature branch until the parent feature is complete unless the user explicitly asks.
- Use one command per tool call; avoid multi-command `zsh -lc` strings and repo-external temp files.
- If child issues are missing, use `/issues action=breakdown` to create them.
- Use the docs prompt and documentation style guide when updating docs.
- If docs are required but deferred, create a doc child issue and link it in the parent issue's **Docs impact** section.
- Run quality checks per `docs/dev/workflows/quality.md` before opening a PR.
- If tests are known failing, skip them only with an explicit PR note and a follow-up issue.
- Confirm branch protection and rulesets for `main` before merging so required checks match available CI.
- If data import/export/backup/restore is affected, require a backup/restore verification (or document a waiver) before merge.
- If docs are updated or added, update `index.md` and documentation inventory entries as needed.
- Warn the user and get explicit confirmation before any high-risk action (history rewrites, force pushes, repo settings changes, mass deletions, destructive resets, data purges).
- Before switching branches or starting the feature, confirm the working tree is clean or ask the user how to handle existing changes.
- Confirm repo ID + name, `cwd`, and `git remote -v` before any mutating action (push/merge/issue edits).

## Branch Protection (One-Time Setup)

Use this once per repo to keep `main` safe without blocking work.

1. Go to GitHub → Settings → Rules → Rulesets → New ruleset.
2. Target `main` only.
3. Enable:
   - Require pull requests before merging.
   - Block force pushes.
   - Block branch deletion.
4. Status checks (recommended once CI is stable):
   - Require `unit-tests`.
   - Require `pr-body-validation` (V-model evidence guard).
   - Stage rollout: enable as **informational** first, then mark required once the team is ready.
5. Optional when the team is ready:
   - Require 1 approval and resolve conversations (skip for solo maintainer).
6. If a required check must be waived, document the waiver in the PR with reason and approval.

## Steps

1. Start the feature workflow:
   - Run `/feature action=start issue={parent}` or `feature start {parent}`.
   - Confirm the branch name and ordered child issues.
   - Validate the parent issue plan per `docs/dev/workflows/development.md` and comment if changes are needed.
   - Ensure each child issue includes a test plan (automated specs + TP-xx/manual checks) and mark it approved before coding.
   - Confirm a design/architecture review was completed and ADR decisions are recorded before coding.
2. Implement each child issue:
   - Run `/feature action=next` or `feature next` to select the next issue.
   - Review the issue plan and feasibility per `docs/dev/workflows/development.md` before coding.
   - Confirm the test plan is approved; if it changes, update the issue and re-approve before coding.
   - Confirm the design/ADR decision is documented; update it if scope changes before coding.
   - If requirements/ACs change, update the issue, traceability, and test plan, then re-approve before coding.
   - Complete acceptance criteria, update docs, and close the issue.
   - If behavior changes, run `testing scope` to select regression packs, enumerate required automated specs, update/add those tests, execute automated/manual checks, record TP-xx IDs, and log any deferrals with a follow-up issue.
   - Use `/docs` (`doc: align` / `doc: guide`) for any doc updates tied to the issue.
   - If docs are required but deferred, create a doc child issue and link it in the parent issue's **Docs impact** section.
   - Run at least one base check (default: `npm run build`) and note results. Fix any errors before closing the child issue.
   - If `public/build-info.json` changes, restore it before committing.
   - Commit the child issue work before moving to the next child issue.
   - Update the parent checklist safely; if tooling is missing, leave a progress comment instead of editing the body.
   - Optional: run `feature all` to continue automatically through remaining child issues (or to resume from any stage).
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
   - Run required usage scenarios when behavior affects end-to-end flows (see `docs/testing/usage-scenario-tests.md`) and record the scenario IDs.
   - Record validation/UAT sign-off (self-review OK for solo maintainer).
   - Confirm automated coverage was added/updated for any new behavior; list the relevant specs in the PR Review Evidence.
   - Restate repo ID + name, `cwd`, `git remote -v`, and target issue/PR before push/PR/merge.
   - Push the feature branch now (only after all child issues are complete).
   - Open a PR linked to the parent issue.
   - Run `feature review` to perform the review + merge flow (or use `pr review` and `pr merge` manually).
   - Verify the PR includes the Review Evidence section; if missing, stop and update the PR before merge.
   - Verify the PR Traceability section is completed and matches executed tests; update it before review/merge if needed.
   - Perform a code review using `pr review` and `docs/dev/workflows/code-review.md`, then document it via a formal GitHub review (approve/request changes).
     - Include evidence: acceptance criteria coverage, tests/TP-xx packs, and known gaps.
   - If you are a solo maintainer, use a formal self-review comment and ensure branch protections do not require approvals.
   - Confirm branch protection/rulesets won’t block the merge and note any skipped checks in the PR.
   - Cross-check parent acceptance criteria against child outcomes and mark parent checklist items complete when satisfied.
7. Cleanup after merge:
   - Ensure the feature branch is deleted (auto-delete or `/branch action=delete name={branch}`).
   - Delete the local feature branch once merge is confirmed.
   - Prune refs with `git fetch --prune` and switch back to `main`.

## Checks

- Branch is created and linked to the parent issue.
- All child issues are closed or explicitly deferred.
- Parent issue checklist reflects completion.
- Issue plans reviewed and approved before implementation.
- Test plans approved before implementation; changes re-approved if scope changed.
- Design/architecture review completed and ADR decision recorded.
- PR includes `Fixes #{parent}` in the description.
- PR includes Review Evidence content (AC coverage, tests, TP-xx packs, manual checks, risks/gaps).
- PR Review Evidence lists the automated specs updated and the TP-xx packs executed.
- PR Traceability section maps ACs to evidence and matches tests run.
- Review is documented (approval or self-review comment) before merge.
- Validation/UAT sign-off recorded with scenario IDs when applicable.
- Branch protection does not require external approvals for solo-maintainer repos.
- Branch protection/ruleset requirements are understood and satisfied.
- Testing status is documented when checks are skipped.
- Backup/restore verification is documented when data flows change (or a waiver is recorded).
- Documentation index/inventory updates are included when docs change.
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
- Added an explicit test-plan approval gate and review-evidence requirement for automated specs.
- Added a traceability requirement to link acceptance criteria to verification evidence.
- Added a design/architecture review gate with ADR decision tracking.
- Added change-control guidance for requirements/AC updates and re-approval.
- Added validation/UAT sign-off requirement with usage-scenario references.
- Documented required status checks (unit-tests, pr-body-validation) and staged rollout guidance.
- Folded `feature-all` into the `feature` prompt and clarified the state-aware flow.
- Added a docs-impact gate to ensure documentation updates are completed or tracked with a doc child issue.

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
