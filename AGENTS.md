# Agent Instructions – Biruk’s Egg Deliveries

These instructions apply to all code in this repository and define how agents should operate here.
Follow them alongside system and developer instructions.

- **Status**: Stable
- **Owner**: repo maintainers
- **Last updated**: 2025-12-30
- **Type**: Reference
- **Scope**: agent behavior and repo-specific standards
- **Non-goals**: replace system/developer instructions or code-level standards
- **Applies to**: all files in this repository

## Canonical coding standards

- The canonical Angular / TypeScript / accessibility standards for this repo live in:
  - `.github/instructions/project-standards.instructions.md`
- Agents working in this repository **must read and follow** those standards when writing or modifying TypeScript, Angular templates, HTML, or styles.

## Prompt and workflow helpers

- Reusable workflow prompts live under `.github/prompts`.
- When asked to perform any workflow (for example, "status", "ship it", "log issue"), agents should consult the corresponding prompt file and follow its guidance as closely as the current environment allows.

## Command best practices

- Prefer `--body-file` for multi-line `gh issue create` bodies to avoid shell quoting/pipeline issues.
- Avoid `cat <<EOF | gh issue create` pipes in favor of temp files or `--body-file`.
- When adding new operational guidance, update the relevant prompt/workflow doc and note it here.
- Canonical guidance for issue creation lives in `.github/prompts/issues.prompt.md` and `docs/dev/workflows/triage.md`.

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
- Linked the new agent terminal practices doc for settings-aligned command usage.
