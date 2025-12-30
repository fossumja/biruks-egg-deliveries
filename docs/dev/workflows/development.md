# Development Workflow

Use this workflow to set up and run the app locally during active development.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-30
- **Type**: How-to
- **Scope**: local development workflow
- **Non-goals**: CI/release procedures
- **Applies to**: contributors working in `src/`

## Trigger

- You are starting new work or resuming local development.
- You need to run the app to validate changes.
- A scoped issue or plan exists and needs implementation.

## Inputs

- The task you are working on (feature, fix, docs-only).
- Issue link and plan (issue body, checklist, or linked doc).
- Current branch and base branch.
- Trunk branch (default: `main`).

## Constraints

- Follow naming rules in `docs/dev/best-practices/file-naming.md`.
- Use best-practice docs as the source of truth for standards.
- Validate the issue and plan against the code before implementation.
- If plan changes are needed, comment on the issue with the updated plan and rationale.
- When a plan has already been reviewed multiple times, explicitly mark the revised plan as approved and proceed unless a decision is blocking.
- Avoid adding new tooling without approval.
- Prefer prompts for repeatable tasks; create a prompt if one is missing.
- Use the docs prompt and documentation style guide for any doc updates.
- Use the testing workflow and TP-xx packs for behavior changes; update or add tests to cover new behavior.
- Use short-lived feature branches off `main`; delete them after merge.
- Respect branch protection and rulesets on `main`; confirm required checks are available before planning a merge.
- Capture process learnings by updating prompts/workflows and the prompt catalog when gaps are discovered.

## Steps

1. Review the issue and proposed plan:
   - Confirm acceptance criteria, scope boundaries, and dependencies.
   - Identify missing context (designs, data contracts, ADRs) before coding.
2. Validate feasibility in the codebase:
   - Scan relevant files, services, and tests to confirm the plan is implementable.
   - Note risks, migrations, or test packs likely required for the change.
3. Adjust and approve the plan when needed:
   - If the plan needs changes, update the plan/checklist and comment on the issue with the revised steps.
   - Explicitly mark the updated plan as approved and continue unless a blocking decision remains.
4. Set up the branch (if needed):
   - Use `.github/prompts/branch.prompt.md` for branch creation or sync.
5. Read the repo overview:
   - Review `README.md` for setup and dev server commands.
6. Prepare dependencies:
   - Install dependencies per `README.md`.
7. Start the dev server:
   - Run the documented start command.
8. Make changes and validate:
   - Use targeted checks (lint/test) when the change affects behavior.
   - Use the testing workflow (`testing scope`) to select regression packs when behavior changes, then run automated/manual checks and record the TP-xx IDs.
   - Update or add tests for behavior changes; if coverage is deferred, log a follow-up issue and note it.
   - Run at least one base check (default: `npm run build`) for each issue-sized change.
   - If `public/build-info.json` changes, restore it before committing.
9. Update docs when behavior changes:
   - Use `/docs` with `doc: guide <file>` or `doc: align <file>` to keep docs consistent with the style guide.
10. Retrospective (regular):
   - After each feature or significant change, capture what worked, what hurt, and the next improvement.
   - Update prompts/workflows when you find friction or missing steps.
   - Update `docs/dev/workflows/prompts.md` when prompt behavior changes.
11. Cleanup after merge:
   - Delete the feature branch (local + remote) with `/branch action=delete name={branch}`.
   - Prune refs with `git fetch --prune`.

## Checks

- App runs locally and loads without errors.
- Changes render/behave as expected.
- Relevant docs updated when behavior changes.
- Issue and plan reviewed; any plan updates are documented and approved.
- Retrospective notes captured for completed features.
- Base checks run for each issue-sized change.
- Testing workflow executed when behavior changes, with pack IDs recorded.

## Outputs

- Local changes ready for review.
- Updated docs or notes for any user-visible changes.
- Plan review notes captured on the issue when adjustments are required.
- Retrospective notes recorded when applicable.

## What changed / Why

- Added issue and plan review steps to validate feasibility before implementation.
- Added guidance for plan updates, issue comments, and explicit self-approval to reduce review loops.
- Added explicit docs prompt guidance so documentation updates stay aligned with the style guide.
- Added testing workflow integration so behavior changes drive regression packs and test updates.

## Related docs

- `.github/prompts/branch.prompt.md`
- `.github/prompts/docs.prompt.md`
- `README.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `docs/dev/workflows/docs.md`
- `docs/dev/workflows/testing.md`
- `.github/prompts/testing.prompt.md`
- `docs/dev/workflows/quality.md`
