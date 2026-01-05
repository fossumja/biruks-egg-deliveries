# Development Workflow

Use this workflow to set up and run the app locally during active development.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-05
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
- Require a documented and approved test plan before implementation; re-approve if scope changes.
- Require a change-impact summary (flows, files, automation, TP-xx packs) in the issue before coding.
- Perform a design/architecture review and decide whether an ADR is required; record the decision.
- Use short-lived feature branches off `main`; delete them after merge.
- Respect branch protection and rulesets on `main`; verify required checks are available before planning a merge.
- Capture process learnings by updating prompts/workflows and the prompt catalog when gaps are discovered.
- In sandboxed environments, base checks and Karma may require escalated permissions; rerun with approval if blocked.
- Warn the user and get explicit confirmation before any high-risk action (history rewrites, force pushes, repo settings changes, mass deletions, destructive resets, data purges).
- Before starting new work or switching branches, check the working tree; ask the user how to handle existing changes only if it is not clean.
- Use one command per tool call; avoid multi-command `zsh -lc` strings and repo-external temp files.
- Confirm repo ID + name, `cwd`, and `git remote -v` before any mutating action (push/merge/issue edits).

## ADR trigger checklist

Create or update an ADR in `docs/decisions/` when changes:

- Introduce or alter data models, storage schema, or persistence rules.
- Change cross-feature behavior or core user flows.
- Affect CSV formats, backup/restore behavior, or data migration logic.
- Add or replace external integrations, device APIs, or platform dependencies.
- Introduce new invariants, performance tradeoffs, or security considerations.

If none apply, document the design decision in the issue (comment or checklist note).

## Steps

1. Review the issue and proposed plan:
   - Confirm acceptance criteria, scope boundaries, and dependencies.
    - Identify missing context (designs, data contracts, ADRs) before coding.
    - Review UX, data-model, and architecture impact; decide if an ADR is required and document the decision (ADR or issue note).
    - Record a change-impact summary (flows, files, automation, TP-xx packs) and update the issue if missing.
    - Confirm the issue lists required automated specs and TP-xx/manual checks, and mark the test plan approved.
    - If the test plan section is missing or incomplete, stop and update the issue before proceeding.
   - For regression/testing-plan issues, ensure the plan includes pack updates, manual checks, automation references, usage-scenario updates, and change-impact map updates.
2. Validate feasibility in the codebase:
   - Scan relevant files, services, and tests to confirm the plan is implementable.
   - Note risks, migrations, or test packs likely required for the change.
3. Adjust and approve the plan when needed:
   - If the plan needs changes, update the plan/checklist and comment on the issue with the revised steps.
   - Explicitly mark the updated plan as approved and continue unless a blocking decision remains.
   - If the test plan changes, update it in the issue and re-approve before continuing.
   - If requirements/ACs change, update the issue, traceability notes, and re-approve before continuing.
4. Set up or sync the branch (canonical branching procedure):
   - Use `.github/prompts/branch.prompt.md` to execute these steps.
   - If an issue number/URL is available, prefer:
     - `gh issue develop <issue>` (use `--base <base>` when needed).
   - Otherwise create a branch:
     - `git fetch origin`
     - `git checkout <base>`
     - `git pull --ff-only`
     - `git checkout -b <newBranch>`
     - Push upstream only when explicitly requested for feature branches: `git push -u origin <newBranch>`.
   - Sync as needed:
     - `git fetch origin`
     - Merge default: `git merge origin/<base>` (use rebase only when requested).
     - If rebased and already pushed: `git push --force-with-lease` (confirm first).
   - Cleanup after merge:
     - `git branch -d <branch>` (use `-D` only with confirmation).
     - `git push origin --delete <branch>`.
     - `git fetch --prune`.
   - Treat remote deletes, force deletes, and rebasing shared branches as high risk; confirm before proceeding.
5. Read the repo overview:
   - Review `README.md` for setup and dev server commands.
6. Prepare dependencies:
   - Install dependencies per `README.md`.
7. Start the dev server:
   - Run the documented start command.
   - If multiple instances are running, use a distinct port (e.g., `ng serve --port 4201`).
8. Make changes and validate:
   - Use targeted checks (lint/test) when the change affects behavior.
   - Use the testing workflow (`testing scope`) to select regression packs when behavior changes, then run automated/manual checks and record the TP-xx IDs.
   - Update or add tests for behavior changes; if coverage is deferred, log a follow-up issue and note it.
   - Review `docs/testing/regression-tests.md` and `docs/testing/usage-scenario-tests.md` for updates when new behaviors or flows are introduced.
   - Run at least one base check (default: `npm run build`) for each issue-sized change; fix any errors before closing the issue.
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
- Change-impact summary recorded in the issue (flows, files, automation, TP-xx packs).
- Retrospective notes captured for completed features.
- Base checks run for each issue-sized change.
- Issues are closed only after base checks pass.
- Testing workflow executed when behavior changes, with pack IDs recorded.
- Test plan approved before coding; changes were re-approved if scope changed.
- Design/architecture review completed and ADR decision recorded.
- Change-control followed when requirements/ACs changed, with re-approval recorded.
- High-risk actions were confirmed explicitly before execution.
- Working tree state was checked before switching workstreams; questions were raised only when dirty.

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
- Added a sandbox note for base checks and Karma requiring escalated permissions.
- Added explicit confirmation requirement for high-risk actions.
- Clarified that worktree cleanliness is checked and only prompts when dirty.
- Added a regression-testing plan detail check to prevent under-specified test coverage issues.
- Added a test-plan approval requirement to align with V-model planning gates.
- Added a design/architecture review gate with ADR decision guidance.
- Added change-control guidance for requirements/AC updates and re-approval.
- Added a change-impact summary requirement to map flows, files, automation, and TP-xx packs before coding.
- Added a canonical branching procedure so prompts can reference workflows instead of duplicating branch steps.

## Related docs

- `.github/prompts/branch.prompt.md`
- `.github/prompts/docs.prompt.md`
- `README.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `docs/dev/workflows/docs.md`
- `docs/dev/workflows/testing.md`
- `.github/prompts/testing.prompt.md`
- `docs/dev/workflows/quality.md`
