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
- `feature all {issue}` runs the state-aware full lifecycle (start → next loop → finish).
- Repo ID: derive a short alias from `docs/reference/project-profile.md` when present; otherwise derive from the repo name (for example, `biruks-egg-deliveries` → `BED`).

## Canonical workflow references

- `docs/dev/workflows/feature-delivery.md`
- `docs/dev/workflows/development.md`
- `docs/dev/workflows/testing.md`
- `docs/dev/workflows/quality.md`
- `docs/dev/workflows/code-review.md`

## Delegations (use other prompts when appropriate)

- **Branching:** use `.github/prompts/branch.prompt.md` for create/sync/delete.
- **Testing:** use `.github/prompts/testing.prompt.md` for TP-xx pack selection and execution.
- **Quality:** use `.github/prompts/quality.prompt.md` for required checks and reporting.
- **Docs:** use `.github/prompts/docs.prompt.md` when documentation updates are required.
- **PRs:** use `.github/prompts/pr.prompt.md` for PR create/review/merge steps.
- **Issues:** use `.github/prompts/issues.prompt.md` for breakdowns or follow-ups.

Before delegating, confirm the target prompt exists and is up to date. If it is missing or stale, update it before relying on it.

## Decision aids

- Use **action=start** when the parent issue exists but no feature branch/workflow has started.
- Use **action=next** when a feature branch exists and at least one child issue is open.
- Use **action=finish** only when all child issues are closed and the parent checklist is complete.
- Use **action=review** after `feature finish` and once a PR exists.
- Use **action=all** to auto-detect the stage and chain start → next loop → finish.

Stop and ask immediately when:

- The issue lacks test-plan approval or ADR decisions required by the V-model gates.
- UX/styling choices or algorithm/data rules are unclear.
- The working tree is not clean and changes are unrelated to the active child issue.
- A high-risk action is required (history rewrite, ruleset change, destructive delete).

Documentation gates (do not skip):

- Issue test plan includes specs + TP-xx/manual checks and is approved.
- PR Review Evidence + Traceability are complete and match tests run.
- Retrospective notes are captured and applied or tracked.

## Context probes (always do)

- Verify repo ID + repo name, `cwd`, and `git remote -v` match the intended repo.
- Verify current branch, working tree cleanliness, and whether a PR already exists.
- If a PR exists, prefer resuming at `feature review` unless work remains.
- If the user invoked `feature finish` or `feature review`, treat that as authorization for standard push/PR/merge steps once the guard values match; ask only if a mismatch or high-risk action appears.

## Procedure

## action=start

1. Follow `docs/dev/workflows/feature-delivery.md` (Start) and `docs/dev/workflows/development.md` for plan validation.
2. Ensure child issues exist, test plans are approved, and ADR/design decisions are recorded.
3. Create or reuse the feature branch via `.github/prompts/branch.prompt.md`.
4. Report the branch name and planned child issue order.

## action=next

1. Follow `docs/dev/workflows/feature-delivery.md` (Implement child issues) and `docs/dev/workflows/development.md`.
2. Validate the issue plan, change-impact summary, test plan approval, and ADR decisions before coding.
3. Implement the change, run tests per `docs/dev/workflows/testing.md`, and update docs per `docs/dev/workflows/docs.md`.
4. Run a base check, commit the child issue, and update the child + parent issue status (no push unless requested).

## action=status

1. Report the current branch name and sync status.
2. List open vs closed child issues and remaining work.
3. Flag blockers or unknowns that need a decision.

## action=finish

1. Follow `docs/dev/workflows/feature-delivery.md` (Finish) plus testing + quality workflows.
2. Verify docs impact is resolved and required regression packs/scenarios are recorded.
3. Confirm `public/release-notes.json` is updated for user-visible changes before opening the PR.
4. Refresh build info for the Home footer (`npm run build` or `node scripts/write-build-info.js`), verify the timestamp updates after reload, and restore `public/build-info.json` before commit.
5. Run the multi-repo guard before push/PR/merge, then proceed without an extra confirmation if values match.
6. Push and open a PR via `.github/prompts/pr.prompt.md`, then review/merge per `docs/dev/workflows/code-review.md` and clean up the branch.

## action=review

1. Follow `docs/dev/workflows/code-review.md` for the review steps and evidence checklist.
2. Verify checks and branch protection requirements, then run the multi-repo guard.
3. Merge via `.github/prompts/pr.prompt.md` and perform cleanup (no extra confirmation needed when `feature review` was invoked).

## action=all

1. Follow `docs/dev/workflows/feature-delivery.md` for the state-aware `feature all` flow.
2. Stop and ask when requirements are unclear, a decision is needed, or a high-risk action is required.

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
