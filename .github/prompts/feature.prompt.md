---
name: "feature"
description: "Deliver a feature by creating a branch from a parent issue and completing child issues."
argument-hint: "action=start|next|status|finish|review|all issue=<parent#|url> branch=<optional> (shorthand: feature {action} [issue])"
agent: "agent"
---

# Prompt: feature

You are my feature delivery assistant.

## Goals

- Create a feature branch linked to the parent issue.
- Work through child issues in a sensible order until the feature is complete.
- Keep issue metadata and parent checklists accurate.
- Minimize back-and-forth by making reasonable defaults explicit.
- Use the testing workflow for behavior changes and record TP-xx pack IDs.

## Inputs

- Parent issue number or URL.
- Optional branch name (otherwise derive from issue title).
- Optional preferred order for child issues.

## Defaults

- Base branch: infer the repo default branch.
- Branch naming: follow `.github/prompts/branch.prompt.md` (`feat/<slug>`).
- Issue order: data/storage -> export/import -> UI -> tests -> docs -> ops, unless the parent issue specifies otherwise.
- Shorthand: `feature start {issue}`, `feature next`, `feature status`, `feature finish`, `feature review` map to their respective actions.
- `feature all {issue}` delegates to the `feature-all` prompt to run the state-aware full lifecycle.

## Procedure

## action=start

1. Read the parent issue and extract child issue links or checklists.
2. Validate the parent plan against the codebase per `docs/dev/workflows/development.md` and comment if changes are needed.
3. Ensure each child issue includes a test plan (automated specs + TP-xx/manual checks) and mark it approved before coding.
   - If missing, stop and request updates to the issue before proceeding.
4. Confirm design/architecture review is completed and ADR decisions are recorded before coding.
5. If no child issues are listed:
   - Search for issues referencing the parent (for example, `#{parent}` in the issue body).
   - If still missing, ask once whether to create them via `/issues action=breakdown`.
6. Create or reuse a feature branch:
   - If a linked branch exists, check it out.
   - Prefer `gh issue develop <issue>` if available.
   - Otherwise follow the branch naming convention in `.github/prompts/branch.prompt.md`.
7. Verify the current branch matches the feature branch; if not, check out the local branch from `origin/<branch>`.
8. Build an execution order (data/storage -> export/import -> UI -> tests -> docs -> ops) unless the parent issue specifies a different order.
9. Report the branch name and planned issue order.

## action=next

1. Identify the next open child issue (or ask if multiple are equally valid).
2. Restate its acceptance criteria, impacted files, test plan (automated specs + TP-xx/manual checks), and unknowns before changes.
3. Validate the issue plan against the codebase per `docs/dev/workflows/development.md`; update the issue plan and mark it approved if changes are needed.
4. Confirm the test plan is approved; if it changes, update the issue and re-approve before coding.
5. Confirm the design/ADR decision is documented; update it if scope changes before coding.
6. If requirements/ACs change, update the issue, traceability, and test plan, then re-approve before coding.
7. Sync the branch with the base branch if needed.
8. Implement the issue, run targeted tests, and update docs if required.
   - If behavior changes, update/add tests and run `testing scope` to select packs, then execute automated/manual checks and record TP-xx IDs.
9. Run at least one base check (default: `npm run build`) and note results; fix any errors before proceeding. If `public/build-info.json` changes, restore it before committing.
10. If tests are known failing, skip them only with an explicit PR note and a follow-up issue.
11. Commit the child issue work so the branch is clean before moving to the next child issue.
12. Do not push the feature branch yet unless the user explicitly requests it.
13. Update the child issue status (close or comment with progress and test notes) **only after** base checks pass.
14. Update the parent issue checklist to reflect completion:
   - Prefer `python3` or `node` for body edits.
   - Validate the new body is non-empty before calling `gh issue edit`.
   - If tooling is missing or validation fails, add a progress comment instead of editing the body.
15. Capture a brief retrospective note (what worked, what hurt, next improvement) in the parent issue or PR.
16. Update prompts/workflows with any process learnings and refresh the prompt catalog if needed.

## action=status

1. Report the current branch name and sync status.
2. List open vs closed child issues and remaining work.
3. Flag blockers or unknowns that need a decision.

## action=finish

1. Confirm all child issues are closed and the parent checklist is complete.
2. Cross-check parent acceptance criteria and child issue outcomes; mark parent checklist items complete if the evidence supports them.
3. Run the required regression packs per `docs/testing/regression-tests.md`, record TP-xx IDs, and update regression docs if new behavior was introduced.
4. Run required usage scenarios when behavior affects end-to-end flows; record scenario IDs for validation.
5. Record validation/UAT sign-off (self-review OK for solo maintainer).
6. Run the quality workflow if applicable (this is the full check for the feature).
7. Confirm branch protection/rulesets for the base branch so required checks align with available CI.
8. Review retrospective comments on the parent issue (and recent feature parents); apply low-effort fixes now or create follow-up issues for larger work.
9. Push the feature branch now (only after all child issues are complete).
10. Open a PR using `.github/prompts/pr.prompt.md`, linking the parent issue (`Fixes #{parent}`), and note any skipped checks.
11. Perform a code review using `.github/prompts/pr.prompt.md` and document the review in the PR (comment or review), even if there are no findings.
12. Ensure the PR Traceability section is completed and matches the tests executed.
13. Ensure validation/UAT sign-off is recorded with scenario IDs when applicable.
14. After merge, ensure the feature branch is deleted (or run `/branch action=delete name=<branch>` and prune refs).
15. Capture a brief retrospective note (what worked, what hurt, next improvement) in the parent issue or PR.
16. Update prompts/workflows with any process learnings and refresh the prompt catalog if needed.
17. Suggest release workflow if requested.

## action=review

1. Confirm the feature branch is clean and pushed; if not, commit and push before reviewing.
2. Confirm a PR exists for the feature and includes Review Evidence.
3. Run the code review per `docs/dev/workflows/code-review.md` and `pr review`.
   - If self-reviewing and approvals are blocked, leave a formal PR comment with the evidence summary.
4. Verify required checks are complete (`gh pr checks`) and note any skips/waivers.
5. Confirm branch protection requirements are satisfied (approvals, checks).
   - If approvals are required and you cannot self-approve, stop and ask whether to adjust rulesets.
6. Ask for explicit confirmation before merge.
7. Merge via `pr merge` (prefer squash) and ensure the branch is deleted.

## action=all

1. Delegate to `.github/prompts/feature-all.prompt.md`.
2. Use `feature start` when the feature has not been initialized.
3. Loop `feature next` until all child issues are complete.
4. Run `feature finish` once all child issues are done.
5. Stop and ask when requirements are unclear or a high-risk action is required.

## Output

- Branch created/active.
- Ordered list of child issues and current progress.
- Links to issues updated and any remaining actions.

## Related docs

- `docs/dev/workflows/feature-delivery.md`
- `docs/dev/workflows/development.md`
- `docs/dev/workflows/testing.md`
- `.github/prompts/issues.prompt.md`
- `.github/prompts/branch.prompt.md`
- `.github/prompts/pr.prompt.md`
- `.github/prompts/quality.prompt.md`
- `.github/prompts/testing.prompt.md`
