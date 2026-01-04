# Agent Instructions – Biruk’s Egg Deliveries

These instructions apply to all code in this repository and define how agents should operate here.
Follow them alongside system and developer instructions.

- **Status**: Stable
- **Owner**: repo maintainers
- **Last updated**: 2026-01-04
- **Type**: Reference
- **Scope**: agent behavior and repo-specific standards
- **Non-goals**: replace system/developer instructions or code-level standards
- **Applies to**: all files in this repository

## Canonical coding standards

- The canonical Angular / TypeScript / accessibility standards for this repo live in:
  - `.github/instructions/project-standards.instructions.md`
- Agents working in this repository **must read and follow** those standards when writing or modifying TypeScript, Angular templates, HTML, or styles.

## V-model workflow gates

Agents must treat the `feature` workflow as the gateway into V-model verification/validation steps. For feature work:

- Confirm a **design/architecture review** is complete and record any ADR decision before coding.
- Require a **test plan** in the issue (automated specs + TP-xx/manual checks) and mark it approved before implementation.
- If requirements/ACs change, update the issue, traceability notes, and test plan, then re-approve before proceeding.
- Ensure **traceability** from requirements/ACs to verification evidence is documented in the PR.
- Record **validation/UAT sign-off** with usage-scenario IDs when applicable.

Canonical workflows:

- `docs/dev/workflows/feature-delivery.md`
- `docs/dev/workflows/development.md`
- `docs/dev/workflows/testing.md`
- `docs/dev/workflows/code-review.md`

## Prompt and workflow helpers

- Reusable workflow prompts live under `.github/prompts`.
- When asked to perform any workflow (for example, "status", "ship it", "log issue"), agents should consult the corresponding prompt file and follow its guidance as closely as the current environment allows.

## Command best practices

- Prefer `--body-file` for multi-line `gh issue create` bodies to avoid shell quoting/pipeline issues.
- Avoid `cat <<EOF | gh issue create` pipes in favor of temp files or `--body-file`.
- Follow `docs/dev/best-practices/agent-terminal-practices.md` strictly for command structure.
- Do **not** run multi-command `zsh -lc` strings (loops, heredocs, chained commands); run one command per tool call.
- Do **not** embed `gh` calls inside `python3 - <<'PY'` heredocs; run `gh` and `python3` in separate commands or use a repo script file.
- Prefer repo-local temp files (for example `tmp/`) instead of `/tmp` to avoid approval prompts.
- When adding new operational guidance, update the relevant prompt/workflow doc and note it here.
- Canonical guidance for issue creation lives in `.github/prompts/issues.prompt.md` and `docs/dev/workflows/triage.md`.

## Worktree safety checks

- Before starting new work, switching branches, or running a workflow, check for uncommitted changes.
- If the working tree is not clean, determine whether the changes belong to the active child issue:
  - If they do, finish the child work and commit before moving on.
  - If they do not, **stop and ask the user how to proceed** (commit, stash, discard, or keep working on current changes).

## Safety for high-risk actions

- If a task requires a high-risk or potentially irreversible change, **warn the user and get explicit confirmation before proceeding**.
- High-risk actions include:
  - History rewrites (for example `git filter-repo`, BFG, rebasing shared branches).
  - Force pushes or destructive branch/tag deletes (including mass branch cleanup).
  - Repo settings or ruleset changes (branch protection, required checks, permissions).
  - Large-scale deletions or resets (`git reset --hard`, `git clean -fdx`, `rm -rf`, deleting folders across the repo).
  - Data purges or migrations that can delete user data or exports.
- Provide a brief summary of the impact, the alternative (if any), and the rollback option before asking for confirmation.

## Agent terminal practices

- Guidance on terminal command selection and alignment with editor settings lives in `docs/dev/best-practices/agent-terminal-practices.md`.

## Documentation index

- The repository index lives in `index.md`.
- Update `index.md` when documentation is added, removed, or moved.
- Developer best-practice stubs live in `docs/dev/best-practices/` and `docs/dev/workflows/` and should be filled/maintained over time.
- Documentation style for Markdown lives in `docs/dev/best-practices/documentation-style-guide.md` and applies to all human-facing docs.
- When a best practice changes, confirm the new standard first, then update the relevant best-practices doc before applying it elsewhere.

## Scope

- This `AGENTS.md` at the repository root defines the default behavior for all files in the repo.
- If additional `AGENTS.md` files are added in subfolders later, their instructions take precedence for files in those folders.

## What changed / Why

- Added command-formatting guidance so agents avoid brittle shell pipelines for issue creation.
- Added explicit command-structure guardrails (no multi-command `zsh -lc`) and a pointer to terminal practices.
- Added a command-structure rule to avoid embedding `gh` inside Python heredocs, which triggers approval prompts.
- Folded the `feature-all` flow into the `feature` prompt and removed the standalone prompt file.
- Added issue-prompt delegations so agents reuse label/project/triage workflows consistently.
- Added a `develop` prompt for end-to-end V-model delivery (issues → feature → review/merge).
- Refined delegated prompts (branch/testing/quality/PR) to align with V-model evidence and safety gates.
- Added agent-interaction best practices covering structured issue intake and prompt clarity.
- Added prompt quality audit, context probes, and evidence snippet guidance for agent interactions.
- Added `issues` actions for refine/all to cover issue clarity and end-to-end issue flow.
- Linked the new agent terminal practices doc for settings-aligned command usage.
- Added explicit high-risk action warnings so agents confirm before potentially destructive changes.
- Added a worktree safety check requirement so agents confirm how to handle existing changes before switching tasks.
- Added a docs-impact gate so documentation updates are completed or tracked with a doc child issue.
