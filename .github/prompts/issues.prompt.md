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
- Prefer adding:
  - **Problem statement**
  - **Proposed solution**
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

1. Infer a good title (imperative, < 72 chars) if missing.
2. Write a complete issue body including:
   - Context
   - Repro steps (for bugs) or user story (for features)
   - Acceptance criteria checklist
3. Suggest labels (type/area/priority) and apply them if authorized:
   - `gh issue create --title ... --body ... --label "type:...,area:...,priority:..."`
4. If a Project is configured (or user asks), add it:
   - `gh project item-add ... --url <issueUrl>`

### action=breakdown

Given an existing issue (number/URL) or description:

- Start with a documentation review to ground the plan:
  - Read `index.md` to find relevant doc areas.
  - Review applicable docs in `docs/ux/`, `docs/testing/`, `docs/reference/`, `docs/ops/`, `docs/dev/best-practices/`, `docs/decisions/`, and `docs/plans/`.
  - Summarize documented behavior, constraints, and prior decisions before proposing issues.
- Perform a thorough codebase scan to confirm current implementation:
  - Use `rg` to locate relevant models, services, components, templates, tests, and scripts.
  - Identify storage, import/export, and UI entry points that may be affected.
  - List all likely impacted files and any cross-feature impacts or risks.
- Issue content must include:
  - **Impacted files** (explicit file paths)
  - **Potential supporting files** (paths that may be useful but are not confirmed)
  - **Architectural guidance** (recommended boundaries, ownership, and integration points)
  - **Unknowns** (call out gaps where more investigation is needed)
  - For regression/testing-plan issues, also include:
    - **Pack updates (proposed)** with TP-xx IDs
    - **Manual checks to add**
    - **Automation references** (existing specs)
    - **Usage-scenario updates** (if applicable)
    - **Change-impact map updates**
- Decide the issue structure:
  - If work spans multiple areas, multiple deliverables, or 3+ distinct workstreams, create a parent feature issue plus child issues.
  - Otherwise, create a single feature issue with a detailed breakdown.
- When creating a parent feature issue:
  - Title: `Feature: <short name>`
  - Body includes context, goals, non-goals, UX notes, data changes, risks, and acceptance criteria.
  - Label with `type:enhancement`, one `area:*`, and a priority label.
- When creating child issues (activities):
  - Create 3-8 issues covering UI, data/storage, CSV/export, tests, docs, and ops as applicable.
  - Use `type:task` or `type:enhancement` plus `area:*` and priority labels.
  - Link each child to the parent (checklist in the parent body or links in each child).
  - Update the parent issue after child creation to include the real issue URLs.
- Bugs discovered during planning:
  - Create separate bug issues with `type:bug` and the appropriate `area:*`.
- If the scope is ambiguous, ask once before creating multiple issues.
- Produce a task breakdown when creating a single issue:
  - Implementation tasks
  - Tests
  - Docs
  - CI/CD impact
  - Risk notes
- After creating issues:
  - Apply labels at creation time; if default GitHub labels were used as a fallback, replace them with the repo label scheme.
  - Remove default labels (`enhancement`, `documentation`, `bug`) when the custom `type:*` labels are present.

### action=triage

Given a set of issues (list, query, or “open issues”):

- Batch evaluate:
  - Duplicate? needs info? bug vs enhancement?
  - Priority and scope
  - Next action (close, label, assign, move to project column)
- Apply changes via CLI:
  - `gh issue edit` (labels, assignees, milestone, projects) where possible.

### action=close

Close with a reason and optional state:

- `gh issue close <id> --comment "..."`
- If closing as duplicate, reference canonical issue.

### action=refine

Use this when the issue scope is ambiguous or design/algorithm choices are required.

1. Read the issue and linked references; restate the goal in your own words.
2. Scan relevant docs and code to identify unknowns (UX, data model, edge cases).
3. Produce a decision list with:
   - Question
   - Options (2-3)
   - Recommended default (if safe)
4. Ask the questions and pause for answers.
5. After answers, update the issue:
   - Decisions section (bulleted)
   - Acceptance criteria aligned to answers
   - Testing plan updates (specs, TP-xx, manual checks)
6. If any decision remains unknown, stop and request it explicitly.

Stop conditions (always stop and ask):

- Requirements are ambiguous or conflict with existing behavior.
- UX/styling direction is missing and affects layout or validation.
- Algorithm/data decisions impact totals, persistence, or exports.
- A high-risk change is required (history rewrite, ruleset change, data purge).

### action=all

Run the full issue workflow: create, refine if needed, break down, then triage.

1. Determine whether the issue already exists.
2. If not, create it via `issues action=create`.
3. Evaluate clarity; if unclear, run `issues action=refine` and wait for answers.
4. Run `issues action=breakdown` to create child issues when needed.
5. Run `issues action=triage` to apply labels and priority.
6. Stop and ask if any decision is required or a risk gate is triggered.

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
