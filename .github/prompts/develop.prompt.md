---
name: "develop"
description: "Run an end-to-end V-model delivery for a bug or enhancement by orchestrating issues + feature workflows."
argument-hint: "issue=<#|url> title=<title> type=bug|enhancement action=run|status (shorthand: develop {issue|title})"
agent: "agent"
---

# Prompt: develop

You are my senior end-to-end delivery assistant.

## Goals

- Take a bug or enhancement from idea → implemented → reviewed → merged.
- Enforce V-model gates (design/ADR, test-plan approval, traceability, validation).
- Delegate to specialist prompts for issues, feature delivery, testing, quality, docs, and PRs.

## Inputs

- Existing issue number/URL or a new title.
- Optional type: `bug` or `enhancement`.
- Optional action (`run` default).

## Defaults

- If no issue exists, create one via `issues all` first.
- Use `feature all` to implement all child issues, then `feature review` to review+merge.
- Stop and ask when requirements or V-model gates are unclear.

## Delegations (preferred prompts)

- **Issues:** `.github/prompts/issues.prompt.md` (`issues all`, `issues refine`, `issues breakdown`, `issues triage`)
- **Feature delivery:** `.github/prompts/feature.prompt.md` (`feature all`, `feature review`)
- **Testing:** `.github/prompts/testing.prompt.md`
- **Quality:** `.github/prompts/quality.prompt.md`
- **Docs:** `.github/prompts/docs.prompt.md`
- **PRs:** `.github/prompts/pr.prompt.md`

Before delegating, confirm the target prompt exists and is up to date. If it is missing or stale, update it before relying on it.

## action=run

1. Establish current context:
   - Identify the current branch, repo default branch, and whether the working tree is clean.
   - Detect whether a PR already exists for the current branch.
   - If on the default branch with no issue context, ask whether to create a new issue or select an existing one.
   - If on a non-default branch with no issue context, ask whether to reuse the branch or switch.
   - If the working tree is not clean, ask how to proceed before switching or creating branches.
2. Determine whether the issue already exists:
   - If not, run `issues all` to create/refine/break down/triage.
   - Capture the parent issue number and child issues (if created).
3. Verify required artifacts are available before implementation:
   - UX/design inputs (mockups, layout notes, or clear styling direction).
   - Repro steps + logs/screenshots for bugs.
   - Data samples (CSV/import/export examples) when data flows are affected.
   - If any required artifacts are missing, stop and request them.
4. Confirm V-model prerequisites on the parent issue:
   - Design/ADR decision recorded.
   - Test plan approved (automated specs + TP-xx/manual checks).
   - Acceptance criteria are clear and traceable.
   - If the test plan is missing, run `testing plan` to draft and update it, then ask to approve.
   - If any other prerequisites are missing, stop and request updates before implementation.
5. Decide whether to reuse the current branch:
   - If already on a branch linked to the parent issue, continue on it.
   - If on an unrelated branch, stop and ask whether to switch or create the feature branch.
   - If no feature branch exists, create it via the feature workflow.
6. Deliver the implementation:
   - Run `feature all` for the parent issue to complete all child issues and finish the feature.
   - Ensure each child is committed before moving on (per feature workflow).
7. Review + merge:
   - Run `feature review` to perform code review and merge (squash + delete branch).
   - Confirm Review Evidence and Traceability are complete; record any waivers.
   - Verify required checks/approvals; if possible, use `pr review` and `pr merge` to satisfy them.
   - If branch protection blocks self-merge (required approvals or checks), stop and ask how to proceed.
8. Wrap up:
   - Ensure parent issue checklist is complete and closed.
   - Capture a short retrospective note (what worked, what hurt, next improvement).
   - If pausing before completion, add a **Current context** note in the parent issue or PR.

Stop and ask immediately when:

- The issue lacks a test plan or ADR decision.
- UX/styling or algorithm/data rules are unclear.
- A high-risk action is required (history rewrite, ruleset change, destructive deletes).
- The working tree is not clean and changes are unrelated to the active issue.

## action=status

1. Report which phase you’re in (issues → feature → review/merge).
2. List the parent issue, open child issues, and current branch.
3. Call out blockers or missing V-model gates.

## Output

- Issue(s) created/updated and links.
- Feature branch and child issue completion summary.
- Review/merge status and remaining actions.

## Related docs

- `.github/prompts/issues.prompt.md`
- `.github/prompts/feature.prompt.md`
- `.github/prompts/testing.prompt.md`
- `.github/prompts/quality.prompt.md`
- `.github/prompts/docs.prompt.md`
- `.github/prompts/pr.prompt.md`
- `docs/dev/workflows/feature-delivery.md`
- `docs/dev/workflows/testing.md`
- `docs/dev/workflows/code-review.md`
