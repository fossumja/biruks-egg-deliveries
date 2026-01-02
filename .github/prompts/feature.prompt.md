---
name: "feature"
description: "Deliver a feature by creating a branch from a parent issue and completing child issues."
argument-hint: "action=start|next|status|finish issue=<parent#|url> branch=<optional> (shorthand: feature {action} [issue])"
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
- Shorthand: `feature start {issue}`, `feature next`, `feature status`, `feature finish` map to their respective actions.

## Procedure

## action=start

1. Read the parent issue and extract child issue links or checklists.
2. Validate the parent plan against the codebase per `docs/dev/workflows/development.md` and comment if changes are needed.
3. If no child issues are listed:
   - Search for issues referencing the parent (for example, `#{parent}` in the issue body).
   - If still missing, ask once whether to create them via `/issues action=breakdown`.
4. Create or reuse a feature branch:
   - If a linked branch exists, check it out.
   - Prefer `gh issue develop <issue>` if available.
   - Otherwise follow the branch naming convention in `.github/prompts/branch.prompt.md`.
5. Verify the current branch matches the feature branch; if not, check out the local branch from `origin/<branch>`.
6. Build an execution order (data/storage -> export/import -> UI -> tests -> docs -> ops) unless the parent issue specifies a different order.
7. Report the branch name and planned issue order.

## action=next

1. Identify the next open child issue (or ask if multiple are equally valid).
2. Restate its acceptance criteria, impacted files, and unknowns before changes.
3. Validate the issue plan against the codebase per `docs/dev/workflows/development.md`; update the issue plan and mark it approved if changes are needed.
4. Sync the branch with the base branch if needed.
5. Implement the issue, run targeted tests, and update docs if required.
   - If behavior changes, update/add tests and run `testing scope` to select packs, then execute automated/manual checks and record TP-xx IDs.
6. Run at least one base check (default: `npm run build`) and note results; fix any errors before proceeding. If `public/build-info.json` changes, restore it before committing.
7. If tests are known failing, skip them only with an explicit PR note and a follow-up issue.
8. Commit the child issue work so the branch is clean before moving to the next child issue.
9. Do not push the feature branch yet unless the user explicitly requests it.
10. Update the child issue status (close or comment with progress and test notes) **only after** base checks pass.
11. Update the parent issue checklist to reflect completion:
   - Prefer `python3` or `node` for body edits.
   - Validate the new body is non-empty before calling `gh issue edit`.
   - If tooling is missing or validation fails, add a progress comment instead of editing the body.
12. Capture a brief retrospective note (what worked, what hurt, next improvement) in the parent issue or PR.
13. Update prompts/workflows with any process learnings and refresh the prompt catalog if needed.

## action=status

1. Report the current branch name and sync status.
2. List open vs closed child issues and remaining work.
3. Flag blockers or unknowns that need a decision.

## action=finish

1. Confirm all child issues are closed and the parent checklist is complete.
2. Cross-check parent acceptance criteria and child issue outcomes; mark parent checklist items complete if the evidence supports them.
3. Run the required regression packs per `docs/testing/regression-tests.md`, record TP-xx IDs, and update regression docs if new behavior was introduced.
4. Run the quality workflow if applicable (this is the full check for the feature).
5. Confirm branch protection/rulesets for the base branch so required checks align with available CI.
6. Review retrospective comments on the parent issue (and recent feature parents); apply low-effort fixes now or create follow-up issues for larger work.
7. Push the feature branch now (only after all child issues are complete).
8. Open a PR using `.github/prompts/pr.prompt.md`, linking the parent issue (`Fixes #{parent}`), and note any skipped checks.
9. Perform a code review using `.github/prompts/pr.prompt.md` and document the review in the PR (comment or review), even if there are no findings.
10. After merge, ensure the feature branch is deleted (or run `/branch action=delete name=<branch>` and prune refs).
11. Capture a brief retrospective note (what worked, what hurt, next improvement) in the parent issue or PR.
12. Update prompts/workflows with any process learnings and refresh the prompt catalog if needed.
13. Suggest release workflow if requested.

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
