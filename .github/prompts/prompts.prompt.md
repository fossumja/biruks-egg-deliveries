---
name: "prompts"
description: "List available workflow prompts with shorthand usage and guidance."
argument-hint: "action=list|find query=<term> (shorthand: prompts [query])"
agent: "agent"
---

# Prompt: prompts

You are my prompt library assistant.

## Goals

- Provide a concise list of prompts with purpose and shorthand examples.
- Help pick the right prompt quickly with minimal back-and-forth.

## Inputs

- `action` (default: list)
- `query` (optional term to filter on name/purpose)

## Defaults

- If no action is provided, list all prompts.
- If a query is provided without action, treat it as `action=find`.

## Procedure

### action=list

1. Read `docs/dev/workflows/prompts.md` as the source of truth.
2. Output the catalog grouped by category, with shorthand examples.

### action=find

1. Read `docs/dev/workflows/prompts.md`.
2. Filter prompts by `query` against names, purposes, and shorthand examples.
3. If nothing matches, suggest likely alternatives.

## Output

- A short list with prompt name, purpose, shorthand example, and related workflow doc.
- If the catalog appears out of date with `.github/prompts/`, call it out and suggest updating `docs/dev/workflows/prompts.md`.
