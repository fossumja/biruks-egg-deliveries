# Agent Instructions – Biruk’s Egg Deliveries

These instructions apply to all code in this repository.

## Canonical coding standards

- The canonical Angular / TypeScript / accessibility standards for this repo live in:
  - `.github/instructions/project-standards.instructions.md`
- Agents working in this repository **must read and follow** those standards when writing or modifying TypeScript, Angular templates, HTML, or styles.

## Prompt and workflow helpers

- Reusable workflow prompts live under `.github/prompts`. In particular:
  - `release.prompt.md` – release, tagging, and GitHub Pages deployment workflows.
  - `issues.prompt.md` – logging and breaking down issues, and project setup guidance.
  - `branch.prompt.md`, `pr.prompt.md`, `labels.prompt.md`, `repo.prompt.md` – git/PR/label/repo workflows.
- When asked to perform any of these workflows (for example, "status", "ship it", "log issue"), agents should consult the corresponding prompt file and follow its guidance as closely as the current environment allows.

## Scope

- This `AGENTS.md` at the repository root defines the default behavior for all files in the repo.
- If additional `AGENTS.md` files are added in subfolders later, their instructions take precedence for files in those folders.
