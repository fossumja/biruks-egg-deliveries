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
2. If no child issues are listed:
   - Search for issues referencing the parent (for example, `#{parent}` in the issue body).
   - If still missing, ask once whether to create them via `/issues action=breakdown`.
3. Create or reuse a feature branch:
   - If a linked branch exists, check it out.
   - Prefer `gh issue develop <issue>` if available.
   - Otherwise follow the branch naming convention in `.github/prompts/branch.prompt.md`.
4. Build an execution order (data/storage -> export/import -> UI -> tests -> docs -> ops) unless the parent issue specifies a different order.
5. Report the branch name and planned issue order.

## action=next

1. Identify the next open child issue (or ask if multiple are equally valid).
2. Restate its acceptance criteria, impacted files, and unknowns before changes.
3. Sync the branch with the base branch if needed.
4. Implement the issue, run targeted tests, and update docs if required.
5. Update the child issue status (close or comment with progress and test notes).
6. Update the parent issue checklist to reflect completion.

## action=status

1. Report the current branch name and sync status.
2. List open vs closed child issues and remaining work.
3. Flag blockers or unknowns that need a decision.

## action=finish

1. Confirm all child issues are closed and the parent checklist is complete.
2. Run the quality workflow if applicable.
3. Open a PR using `.github/prompts/pr.prompt.md`, linking the parent issue (`Fixes #{parent}`).
4. Suggest release workflow if requested.

## Output

- Branch created/active.
- Ordered list of child issues and current progress.
- Links to issues updated and any remaining actions.

## Related docs

- `docs/dev/workflows/feature-delivery.md`
- `.github/prompts/issues.prompt.md`
- `.github/prompts/branch.prompt.md`
- `.github/prompts/pr.prompt.md`
- `.github/prompts/quality.prompt.md`
