# Prompt Library Workflow

Use this workflow to discover, choose, and run prompts consistently. It includes a prompt catalog with shorthand examples.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-30
- **Type**: How-to
- **Scope**: prompt discovery and usage
- **Non-goals**: writing new prompts or changing workflows without review
- **Applies to**: `.github/prompts/`

## Overview

The prompt library is the primary interface for repeatable workflows. Use the catalog to find the right prompt and its shorthand input.

## When to use

- You need the right prompt for a task (feature delivery, docs, releases, triage).
- You want shorthand inputs instead of full `action=` syntax.

## When not to use

- You already know the exact prompt and parameters and do not need discovery.
- The task is outside this repo (use regular chat instructions instead).

## Prerequisites

- Access to the repo and `.github/prompts/`.
- Familiarity with the task domain (docs, release, quality, triage).

## Inputs

- Task description or keyword.
- Optional preferred prompt if you already know it.

## Constraints

- Keep shorthand inputs consistent with each prompt definition.
- Update this catalog and `index.md` when prompts are added or behavior changes.
- Follow the prompt/instruction structure in `docs/dev/best-practices/documentation-style-guide.md`, including a single H1 after front matter.

## Steps

1. List all prompts:
   - Run `prompts`.
2. Filter by keyword when needed:
   - Run `prompts release` or `/prompts action=find query=release`.
3. Pick the prompt and use its shorthand syntax.
4. If a needed prompt is missing, add it under `.github/prompts/` and update this catalog.

## Prompt catalog

### Planning and tracking

- `issues` — create, break down, and triage issues. Shorthand: `issues breakdown 1`. Workflow: `docs/dev/workflows/triage.md`.
- `project` — manage GitHub Projects. Shorthand: `project add 1 2`. Workflow: `docs/dev/workflows/triage.md`.
- `triage` — bulk triage issues and PRs. Shorthand: `triage "is:open label:type:bug"`. Workflow: `docs/dev/workflows/triage.md`.
- `labels` — manage label taxonomy. Shorthand: `labels sync`. Workflow: `docs/dev/workflows/triage.md`.

### Delivery flow

- `feature` — deliver a parent feature with child issues, including plan validation via the development workflow. Shorthand: `feature start 1`. Workflow: `docs/dev/workflows/feature-delivery.md`.
- `branch` — create/sync/delete branches. Shorthand: `branch create feat/{slug}`. Workflow: `docs/dev/workflows/development.md`.
- `commit` — generate commit messages. Shorthand: `commit feat planner #123`. Workflow: `docs/dev/workflows/development.md`.
- `pr` — create/review/update/merge PRs. Shorthand: `pr create`. Workflow: `docs/dev/workflows/development.md`.
- `quality` — run quality gates. Shorthand: `quality check`. Workflow: `docs/dev/workflows/quality.md`.
- `testing` — select and run modular regression packs (TP-xx). Shorthand: `testing scope`. Workflow: `docs/dev/workflows/testing.md`.

### Documentation and knowledge

- `docs` — create or align docs. Shorthand: `docs guide docs/ux/ux-overview.md`. Workflow: `docs/dev/workflows/docs.md`.
- `prompts` — list prompts and shorthands. Shorthand: `prompts release`. Workflow: `docs/dev/workflows/prompts.md`.

### CI and releases

- `ci` — create or update CI workflows. Shorthand: `ci ci angular`. Workflow: `docs/dev/workflows/development.md`.
- `deps` — dependency maintenance. Shorthand: `deps audit`. Workflow: `docs/dev/workflows/quality.md`.
- `release` — ship releases. Shorthand: `release status`. Workflow: `docs/dev/workflows/release.md`.

### Repo setup

- `repo` — bootstrap or standardize a repo. Shorthand: `repo my-repo private`. Workflow: `docs/dev/workflows/development.md`.

## Outcomes

- You can find a prompt quickly and run it using shorthand inputs.
- The prompt catalog stays aligned with the library.

## Troubleshooting

- If a prompt is missing, add it under `.github/prompts/` and update this file.
- If a prompt lacks shorthand, update its `argument-hint` and Defaults section.
- If a prompt changes behavior, update its catalog entry and related workflow doc.

## What changed / Why

- Documented the feature prompt's plan-validation step so the catalog matches current behavior.
- Reaffirmed catalog maintenance when prompt behavior shifts.
- Added the prompt structure requirement so new prompts align with the style guide.
- Updated the testing prompt catalog entry to reflect pack ID reporting.

## Related docs

- `.github/prompts/prompts.prompt.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `docs/dev/workflows/feature-delivery.md`
- `docs/dev/workflows/development.md`
- `docs/dev/workflows/docs.md`
- `docs/dev/workflows/quality.md`
- `docs/dev/workflows/release.md`
- `docs/dev/workflows/triage.md`
