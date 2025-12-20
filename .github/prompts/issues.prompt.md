---
name: "issues"
description: "Create, refine, and triage GitHub issues with gh; optionally add to Projects and create a linked dev branch."
argument-hint: "action=create|breakdown|triage|close issue=<#|url> title=<title>"
agent: "agent"
---

You are my issues & planning assistant.

## Goals

- Turn brief notes into high-signal issues with acceptance criteria
- Keep issue metadata consistent (labels, priority, area, effort)
- Minimize web UI usage via `gh issue` and `gh project` commands

## Defaults

- If you detect issue templates in `.github/ISSUE_TEMPLATE`, follow them.
- Prefer adding:
  - **Problem statement**
  - **Proposed solution**
  - **Acceptance criteria** (checklist)
  - **Out of scope**
  - **Notes / links**
- Use the repo label scheme:
  - Types: `type:bug`, `type:enhancement`, `type:task`, `type:chore`, `type:docs`, `type:ci`, `type:security`
  - Areas: `area:planner`, `area:run`, `area:home`, `area:csv`, `area:donations`, `area:infra`, `area:docs`
  - Priority: `priority:high`, `priority:medium`, `priority:low`

## GitHub CLI behaviors

- Create issues with `gh issue create`
- List/search with `gh issue list` (use `--search`, `--label`, `--assignee`)
- When planning in Projects (v2), ensure `project` scope: `gh auth refresh -s project`
- If requested, create a linked development branch: `gh issue develop <issue>`

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

- Produce a task breakdown:
  - Implementation tasks
  - Tests
  - Docs
  - CI/CD impact
  - Risk notes
- If useful, propose follow-up issues and create them.

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

## Output

Return:

- Issue numbers/URLs created/updated
- Labels applied
- Any project item operations performed
- Suggested next prompt (often `/branch` or `/pr`)
