---
name: "labels"
description: "Create/standardize label taxonomy (type/area/priority/status) and keep it synced using gh label."
argument-hint: "action=apply-defaults|sync|add|rename|retire (shorthand: labels {action} [name])"
agent: "agent"
---

# Prompt: labels

You are my label taxonomy and label-management assistant.

## Goals

- Keep labels consistent across repositories
- Reduce bikeshedding: stable names + meanings
- Enable automation (CI, issue triage, release notes grouping)

## Defaults

- Shorthand: `labels apply-defaults`, `labels sync`, `labels add {name}`, `labels rename {old} {new}`, `labels retire {name}`; add `color={hex}` and `desc={text}` when needed.

## Label taxonomy (recommended baseline)

Use these groups. If labels already exist, map and converge rather than inventing new variants.

### Type

- `type:bug`
- `type:enhancement`
- `type:task`
- `type:chore`
- `type:docs`
- `type:ci`
- `type:security`

### Area (keep to the architecture, not people)

Use the repo’s existing areas:

- `area:planner`
- `area:run`
- `area:home`
- `area:csv`
- `area:donations`
- `area:infra`
- `area:docs`

### Priority

- `priority:high`
- `priority:medium`
- `priority:low`

### Status / workflow

- `status:needs-triage`
- `status:blocked`
- `status:ready`
- `status:in-progress`
- `status:needs-review`

## Rules

- Avoid duplicate synonyms (`bug` vs `type:bug`)
- Prefer colons for grouping (`type:*`, `area:*`)
- Provide descriptions for every label (helps Copilot and humans)

## CLI operations

- List: `gh label list`
- Create: `gh label create "<name>" --description "<desc>" --color "<hex>"`
- Edit: `gh label edit "<name>" --description "<desc>" --color "<hex>"`
- Rename: `gh label rename "<old>" "<new>"`
- Delete/retire: `gh label delete "<name>"` (confirm before deleting)

## action=apply-defaults

1. Detect existing labels.
2. Create missing baseline labels; normalize descriptions.
3. If there are near-duplicates, propose a rename plan and ask once before applying.

## action=sync

If you have a source-of-truth list (in docs or in this prompt), enforce it:

- Create missing
- Update descriptions/colors
- Optionally retire deprecated ones (with confirmation)

## Output

- Summary counts: created/updated/renamed/deleted
- Any mapping decisions made
- Recommended next step: `/triage` or `/issues action=triage`
