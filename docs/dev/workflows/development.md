# Development Workflow

Use this workflow to set up and run the app locally during active development.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-22
- **Type**: How-to
- **Scope**: local development workflow
- **Non-goals**: CI/release procedures
- **Applies to**: contributors working in `src/`

## Trigger

- You are starting new work or resuming local development.
- You need to run the app to validate changes.

## Inputs

- The task you are working on (feature, fix, docs-only).
- Current branch and base branch.
- Trunk branch (default: `main`).

## Constraints

- Follow naming rules in `docs/dev/best-practices/file-naming.md`.
- Use best-practice docs as the source of truth for standards.
- Avoid adding new tooling without approval.
- Prefer prompts for repeatable tasks; create a prompt if one is missing.
- Use short-lived feature branches off `main`; delete them after merge.
- Respect branch protection and rulesets on `main`; confirm required checks are available before planning a merge.
- Capture process learnings by updating prompts/workflows and the prompt catalog when gaps are discovered.

## Steps

1. Set up the branch (if needed):
   - Use `.github/prompts/branch.prompt.md` for branch creation or sync.
2. Read the repo overview:
   - Review `README.md` for setup and dev server commands.
3. Prepare dependencies:
   - Install dependencies per `README.md`.
4. Start the dev server:
   - Run the documented start command.
5. Make changes and validate:
   - Use targeted checks (lint/test) when the change affects behavior.
   - Run at least one base check (default: `npm run build`) for each issue-sized change.
   - If `public/build-info.json` changes, restore it before committing.
6. Update docs when behavior changes:
   - Apply `doc: guide <file>` to edited docs as needed.
7. Retrospective (regular):
   - After each feature or significant change, capture what worked, what hurt, and the next improvement.
   - Update prompts/workflows when you find friction or missing steps.
   - Update `docs/dev/workflows/prompts.md` when prompt behavior changes.
8. Cleanup after merge:
   - Delete the feature branch (local + remote) with `/branch action=delete name={branch}`.
   - Prune refs with `git fetch --prune`.

## Checks

- App runs locally and loads without errors.
- Changes render/behave as expected.
- Relevant docs updated when behavior changes.
- Retrospective notes captured for completed features.
- Base checks run for each issue-sized change.

## Outputs

- Local changes ready for review.
- Updated docs or notes for any user-visible changes.
- Retrospective notes recorded when applicable.

## Related docs

- `.github/prompts/branch.prompt.md`
- `README.md`
- `docs/dev/workflows/docs.md`
- `docs/dev/workflows/quality.md`
