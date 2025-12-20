# File Naming Conventions

Use lower-case, kebab-case for all new files and folders. Avoid spaces and underscores.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: file and folder naming across the repository
- **Non-goals**: prescribe content structure for documents or code style rules
- **Applies to**: all files and folders in this repository

## General rules

- Keep names descriptive and scoped to the file’s purpose.
- Prefer explicit suffixes (e.g., `*.component.ts`, `*.service.ts`) over generic names.
- Avoid abbreviations unless they are standard and unambiguous (e.g., `csv`).
- Rename files alongside any reference updates (imports, links, docs).

## Angular/TypeScript

- Components: `feature-name.component.ts`, template `feature-name.component.html`, styles `feature-name.component.scss`.
- Services: `feature-name.service.ts`.
- Models/types: `feature-name.model.ts`, `feature-name.type.ts`.
- Routes: `feature-name.routes.ts`.
- Utilities: `feature-name.utils.ts` or `feature-name.helpers.ts` (pick one and be consistent).
- Tests: `feature-name.spec.ts`.

## Docs

- General docs: `docs/<area>/<topic>.md` in lower-case kebab-case.
- ADRs: `docs/decisions/adr-YYYY-MM-DD-short-slug.md`.
- Plans: `docs/plans/<topic>.md`.
- UX: `docs/ux/<topic>.md`.
- Prompts: `.github/prompts/<topic>.prompt.md`.
- Instructions: `.github/instructions/<topic>.instructions.md`.

## Data and archives

- Sample data: `docs/data/<topic>.csv`.
- Deprecated artifacts: `deprecated/docs/`, `deprecated/data/`, `deprecated/code/`.

## Examples

- `src/app/pages/delivery-run.component.ts`
- `docs/architecture/architecture-overview.md`
- `docs/decisions/adr-2025-12-19-run-history-snapshots.md`
