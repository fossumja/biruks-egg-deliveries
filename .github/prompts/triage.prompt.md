---
name: "triage"
description: "Triage issues/PRs in bulk: label, prioritize, assign, and add to Projects with consistent workflow metadata."
argument-hint: "query=is:open is:issue owner=@me project=<number> (shorthand: triage {query})"
agent: "agent"
---

# Prompt: triage

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

## Canonical workflow references

- `docs/dev/workflows/triage.md` (Triage steps and required metadata)

## Procedure

1. Follow `docs/dev/workflows/triage.md` → **Triage** for the canonical steps.
2. Fetch a working set:
   - `gh issue list --search "<query>" --limit 50`
   - For PRs: `gh pr list --search "<query>" --limit 50`
3. Apply labels, priority, and status consistently; add to Projects if requested.
4. If required template sections are missing, run `issues refine` before implementation.
5. When blocked/needs info, comment with a concise request and apply `status:blocked` or `status:needs-triage`.

## Output

- A triage report table:
  - number, title, recommended next step, labels applied, project added (Y/N)
- Commands executed
