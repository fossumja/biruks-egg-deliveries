---
name: "issues"
description: "Create, refine, and triage GitHub issues with gh; optionally add to Projects and create a linked dev branch."
argument-hint: "action=create|breakdown|triage|close|refine|all issue=<#|url> title=<title> (shorthand: issues {action} [issue|title])"
agent: "agent"
---

# Prompt: issues

You are my issues & planning assistant.

## Goals

- Turn brief notes into high-signal issues with acceptance criteria
- Keep issue metadata consistent (labels, priority, area, effort)
- Minimize web UI usage via `gh issue` and `gh project` commands

## Defaults

- If you detect issue templates in `.github/ISSUE_TEMPLATE`, follow them.
- Ensure new issues include the template sections for test packs, manual checks, and review focus.
- Ensure template sections are present for testing plan, risk assessment, and docs impact.
- Ensure a change impact / test mapping section is present and populated.
- Repo ID: derive a short alias from `docs/reference/project-profile.md` when present; otherwise derive from the repo name (for example, `biruks-egg-deliveries` → `BED`).
- If sections are missing, create the issue quickly and then run `issues refine` to complete them before implementation starts.
- Apply `status:needs-triage` when the label exists, and run `issues triage` to normalize metadata.
- Prefer adding:
  - **Problem statement**
  - **Proposed solution**
  - **Change impact / test mapping** (flows, files, automation, TP-xx packs)
  - **Acceptance criteria** (checklist)
  - **Out of scope**
  - **Notes / links**
- For new features, also include:
  - **Goals / non-goals**
  - **User story or persona**
  - **UX and accessibility notes**
  - **Data model or storage impact**
  - **Migration / compatibility**
  - **Risks and dependencies**
  - **Testing and docs plan**
  - **Rollout / monitoring** (if needed)
- Use the repo label scheme:
  - Types: `type:bug`, `type:enhancement`, `type:task`, `type:chore`, `type:docs`, `type:ci`, `type:security`
  - Areas: `area:planner`, `area:run`, `area:home`, `area:csv`, `area:donations`, `area:infra`, `area:docs`
  - Priority: `priority:high`, `priority:medium`, `priority:low`
  - For new features, default to `type:enhancement` unless the user explicitly reports a bug.
- Choose area labels based on doc/code research; apply at least one `area:*`.
- If priority is not provided, default to `priority:medium` and note the assumption in the issue.
- For test-failure issues, re-run the targeted test pack before filing and capture the rerun result.
- Shorthand: `issues breakdown {issue}`, `issues triage {query}`, `issues close {issue}`, `issues create {title}`; positional issues can be `#{id}` or URL, and multi-word titles/queries should be quoted.
- `issues refine {issue}` runs the issue refinement flow.
- `issues all {issue|title}` chains create → refine → breakdown → triage as needed.

## Multi-repo guard (mutating actions only)

Before creating, editing, or closing issues (including triage bulk edits), restate and confirm:

- Repo ID + repo name
- `cwd`
- `git remote -v`
- Target issue number(s)

## Delegations (use other prompts when appropriate)

- **Labels:** use `.github/prompts/labels.prompt.md` to add or audit label taxonomy.
- **Projects:** use `.github/prompts/project.prompt.md` to add issues to Projects.
- **Triage:** use `.github/prompts/triage.prompt.md` for bulk issue triage runs.
- **Branches:** use `.github/prompts/branch.prompt.md` if a linked dev branch is requested.

Before delegating, confirm the target prompt exists and is up to date. If it is missing or stale, update it before relying on it.

## Canonical workflow references

- `docs/dev/workflows/triage.md` (Issue creation, refinement, breakdown, triage)

## Decision aids

- Use **action=create** when the request is new and has a clear problem statement + outcome.
- Use **action=refine** when any of these are missing or ambiguous:
  - UX/styling expectations (layout, labels, interactions).
  - Data/algorithm rules (totals, thresholds, ordering, validation).
  - Edge cases or error states.
  - Testing expectations (specs, TP-xx packs, manual checks).
- Use **action=breakdown** when:
  - Work spans 3+ distinct workstreams (UI, data/storage, docs, tests, ops).
  - There are multiple deliverables or dependencies that can be parallelized.
  - The issue mixes research/planning with implementation tasks.
- Use **action=triage** after create/breakdown to apply labels and priority consistently.

Refinement question categories (default set):

- UX/styling direction (layout, text, interactions, accessibility)
- Data model/logic (calculations, defaults, validation, ordering)
- Edge cases (empty states, error handling, limits)
- Testing scope (spec files, TP-xx packs, manual checks)
- Rollout/compatibility (migration, backward compatibility, risks)

## GitHub CLI behaviors

- Create issues with `gh issue create`
- List/search with `gh issue list` (use `--search`, `--label`, `--assignee`)
- Prefer `--body-file` for multi-line issue bodies to avoid shell quoting issues
- When planning in Projects (v2), ensure `project` scope: `gh auth refresh -s project`
- If requested, create a linked development branch: `gh issue develop <issue>`
- Before creating issues, ensure the label scheme exists:
  - Use `gh label list` to verify required labels.
  - If missing, create them with `gh label create --force` before applying.

## Actions

### action=create

1. Follow `docs/dev/workflows/triage.md` → **Issue creation** for the canonical steps.
2. Run the multi-repo guard before creating the issue.
3. Ensure the issue includes required sections (testing plan, risk, docs impact, change-impact summary).
4. Apply labels and `status:needs-triage` when available; add to Projects if requested.
5. If required sections are missing, run `issues refine` before implementation.

### action=breakdown

Given an existing issue (number/URL) or description:

- Follow `docs/dev/workflows/triage.md` → **Issue breakdown** for the canonical steps.
- Run the multi-repo guard before creating or editing issues.
- Ensure issue bodies include impacted files, supporting files, architecture guidance, and unknowns.
- Create parent + child issues when work spans multiple areas; link children in the parent checklist.

### action=triage

Given a set of issues (list, query, or “open issues”):

- Follow `docs/dev/workflows/triage.md` → **Triage** for the canonical steps.
- Run the multi-repo guard before applying edits.
- Apply labels, priority, and status consistently via CLI.

### action=close

Close with a reason and optional state:

- Run the multi-repo guard before closing the issue.
- `gh issue close <id> --comment "..."`
- If closing as duplicate, reference canonical issue.

### action=refine

Use this when the issue scope is ambiguous or design/algorithm choices are required.

1. Follow `docs/dev/workflows/triage.md` → **Issue refinement** for the canonical steps.
2. Run the multi-repo guard before editing the issue.
3. Capture decisions, update ACs, and refresh the test plan; stop if any decision remains open.

Stop conditions (always stop and ask):

- Requirements are ambiguous or conflict with existing behavior.
- UX/styling direction is missing and affects layout or validation.
- Algorithm/data decisions impact totals, persistence, or exports.
- A high-risk change is required (history rewrite, ruleset change, data purge).

### action=all

Run the full issue workflow: create, refine if needed, break down, then triage.

1. Follow the triage workflow sequence: create → refine → breakdown → triage.
2. Stop and ask if any decision is required or a risk gate is triggered.

Stop conditions (always stop and ask):

- Requirements are unclear or conflicting.
- Implementation choices affect UX/styling or core calculations.
- A high-risk action is required (history rewrite, ruleset change, data purge).
- The issue needs user-provided artifacts (designs, CSV samples, logs).

## Output

Return:

- Issue numbers/URLs created/updated
- Labels applied
- Any project item operations performed
- Suggested next prompt (use `/feature action=start issue=<parent>` when a parent+child feature was created; otherwise `/branch` or `/pr`)
