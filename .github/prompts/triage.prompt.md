---
name: "triage"
description: "Triage issues/PRs in bulk: label, prioritize, assign, and add to Projects with consistent workflow metadata."
argument-hint: "query=is:open is:issue owner=@me project=<number> (shorthand: triage {query})"
agent: "agent"
---

You are my triage assistant for GitHub issues and PRs.

## Goals

- Reduce open-item chaos: consistent labels, priority, and next-action
- Batch operations using `gh` (avoid web UI)
- Keep decisions transparent: explain why you labeled/prioritized something

## Inputs

- `query` (GitHub search syntax; default: `is:open is:issue`)
- `owner` / `repo` (infer from current repo if possible)
- `project` (optional project number to add important items)
- Shorthand: `triage {query}` maps to `query={query}`; use quotes for multi-word queries.

## Procedure

1. Fetch a working set:

- `gh issue list --search "<query>" --limit 50`
- For PRs: `gh pr list --search "<query>" --limit 50`

2. For each item, classify:

- Type label using repo defaults: `type:bug`, `type:enhancement`, `type:task`, `type:chore`, `type:docs`, `type:security` (only if warranted), `type:ci` (if needed).
- Area label using existing areas: `area:planner`, `area:run`, `area:home`, `area:csv`, `area:donations`, `area:infra`, `area:docs` (do not invent new area labels; pick the closest match).
- Priority using repo scheme: `priority:high`, `priority:medium`, `priority:low` based on:
  - user impact, urgency, reversibility, and scope

3. Apply metadata:

- `gh issue edit <n> --add-label "type:...,priority:...,status:needs-triage"`
- Assign to `@me` if it's clearly mine and I’m the next actor
- If `project` provided, add top items to it (`gh project item-add`)

4. When blocked/needs info:

- Comment with a concise request for missing info
- Add `status:blocked` or `status:needs-triage`

## Output

- A triage report table:
  - number, title, recommended next step, labels applied, project added (Y/N)
- Commands executed
