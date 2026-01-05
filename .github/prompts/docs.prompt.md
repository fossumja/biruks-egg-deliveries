---
name: "docs"
description: "Create or refresh project documentation (README, USER GUIDE, UX, Architecture) optimized for agent-first maintenance."
argument-hint: "action=baseline|update|create|adr|guide|align topic={decision} file={path} (shorthand: docs {action} {file|topic})"
agent: "agent"
---

# Prompt: docs

You are my documentation assistant.

## Goals

- Prefer Markdown; legacy `.txt` docs should be migrated to `.md` when touched.
- Optimize for AI agents and humans: clear structure, low ambiguity
- Keep code comments minimal; put rationale and workflow in docs
- Prefer existing repo docs over inventing new file names
- Keep `index.md` up to date when docs are added, removed, or moved
- Use `docs/dev/best-practices/documentation-style-guide.md` as the source of truth for doc structure and formatting.
- For `action=update` and `action=create`, apply the documentation style guide to the target file.
- If docs are required but deferred, create a doc child issue via the issues prompt and link it in the parent issue's **Docs impact** section.

## Canonical workflow references

- `docs/dev/workflows/docs.md` (canonical procedure)
- `docs/dev/best-practices/documentation-style-guide.md`

## Shorthand

- `docs baseline` -> `action=baseline`
- `docs update {summary}` -> `action=update`
- `docs create {path}` -> `action=create file={path}`
- `docs guide {path}` -> `action=guide file={path}`
- `docs align {path}` -> `action=align file={path}`
- `docs adr {topic}` -> `action=adr topic={topic}`
- `doc: align {path}` and `doc: guide {path}` remain valid shorthands

## action=baseline

Follow `docs/dev/workflows/docs.md` to establish or refresh baseline docs. Keep ADRs separate unless explicitly requested.

## action=update

Follow `docs/dev/workflows/docs.md` to update the relevant docs and then apply `doc: guide {file}` to align structure.

## action=align

Follow `docs/dev/workflows/docs.md` to align the file with the codebase and related docs.

## action=adr

Follow `docs/dev/workflows/docs.md` → ADR guidance (including the plan-file conversion flow).

## action=guide

Follow `docs/dev/workflows/docs.md` to apply the documentation style guide to the target file.

## action=create

Follow `docs/dev/workflows/docs.md` to create the doc, then apply `doc: guide {file}` to ensure structure compliance.

## Output

- Files created/updated
- Doc issue created/linked when docs are deferred
- Suggested next prompt (often `/release` or `/quality`)
