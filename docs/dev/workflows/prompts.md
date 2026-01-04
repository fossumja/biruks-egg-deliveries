# Prompt Library Workflow

Use this workflow to discover, choose, and run prompts consistently. It includes a prompt catalog with shorthand examples.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-04
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
- Apply the prompt clarity checklist in `docs/dev/best-practices/agent-interaction-practices.md` when adding or updating prompts.

## Steps

1. List all prompts:
   - Run `prompts`.
2. Filter by keyword when needed:
   - Run `prompts release` or `/prompts action=find query=release`.
3. Pick the prompt and use its shorthand syntax.
4. If you add or edit a prompt, run the prompt quality audit checklist in `docs/dev/best-practices/agent-interaction-practices.md`.
5. If a needed prompt is missing, add it under `.github/prompts/` and update this catalog.

## Prompt catalog

### Planning and tracking

- `issues` — create, refine, break down, and triage issues (including test-failure rerun guidance). Shorthand: `issues refine 1`, `issues all "Title"`, `issues breakdown 1`. Workflow: `docs/dev/workflows/triage.md`.
- `project` — manage GitHub Projects. Shorthand: `project add 1 2`. Workflow: `docs/dev/workflows/triage.md`.
- `triage` — bulk triage issues and PRs. Shorthand: `triage "is:open label:type:bug"`. Workflow: `docs/dev/workflows/triage.md`.
- `labels` — manage label taxonomy. Shorthand: `labels sync`. Workflow: `docs/dev/workflows/triage.md`.

### Delivery flow

- `develop` — end-to-end V-model delivery for a bug or enhancement; it chains `issues all` → `feature all` → `feature review` to get work merged. Shorthand: `develop "Title"` or `develop 123`. Workflow: `docs/dev/workflows/feature-delivery.md`.
- `feature` — deliver a parent feature with child issues, including plan validation, V-model gates (design review, test-plan approval, traceability, validation sign-off, change control), retrospective follow-ups, testing workflow selection for behavior changes, and review/merge flow. Shorthand: `feature start 1`, `feature all 1`, `feature review` (review + merge). Workflow: `docs/dev/workflows/feature-delivery.md`.
- `branch` — create/sync/delete branches. Shorthand: `branch create feat/{slug}`. Workflow: `docs/dev/workflows/development.md`.
- `commit` — generate commit messages. Shorthand: `commit feat planner #123`. Workflow: `docs/dev/workflows/development.md`.
- `pr` — create/review/update/merge PRs. Shorthand: `pr create`. Workflow: `docs/dev/workflows/development.md`.
- `quality` — run quality gates. Shorthand: `quality check`. Workflow: `docs/dev/workflows/quality.md`.
- `testing` — select and run modular regression packs (TP-xx), updating automation notes when coverage changes. Shorthand: `testing scope`. Workflow: `docs/dev/workflows/testing.md`.

### Documentation and knowledge

- `docs` — create or align docs. Shorthand: `docs guide docs/ux/ux-overview.md`. Workflow: `docs/dev/workflows/docs.md`.
- `prompts` — list prompts and shorthands. Shorthand: `prompts release`. Workflow: `docs/dev/workflows/prompts.md`.

### CI and releases

- `ci` — create or update CI workflows. Shorthand: `ci ci angular`. Workflow: `docs/dev/workflows/development.md`.
- `deps` — dependency maintenance. Shorthand: `deps audit`. Workflow: `docs/dev/workflows/quality.md`.
- `release` — ship releases with a TP-11 device checklist callout in release notes. Shorthand: `release status`. Workflow: `docs/dev/workflows/release.md`.

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
- Noted the feature prompt's testing workflow integration for behavior changes.
- Updated prompt entries for retrospective follow-ups and device checklist callouts.
- Updated the feature prompt entry to include V-model gate coverage.
- Folded `feature-all` into `feature` and documented the state-aware `feature all` flow.
- Clarified `issues` prompt coverage for refine/all actions and added decision aids.
- Added the `develop` prompt for end-to-end V-model delivery.
- Added a prompt quality audit step to keep prompt updates consistent and safe.
- Added guidance to use `testing plan` for drafting issue test plans when needed.

## Related docs

- `.github/prompts/prompts.prompt.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `docs/dev/workflows/feature-delivery.md`
- `docs/dev/workflows/development.md`
- `docs/dev/workflows/docs.md`
- `docs/dev/workflows/quality.md`
- `docs/dev/workflows/release.md`
- `docs/dev/workflows/triage.md`
