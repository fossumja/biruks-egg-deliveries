# File Naming Conventions

Use lower-case, kebab-case for all new files and folders. Avoid spaces, underscores, and non-ASCII characters.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-22
- **Type**: Reference
- **Scope**: file and folder naming across the repository
- **Non-goals**: prescribe content structure for documents or code style rules
- **Applies to**: all files and folders in this repository

## General rules

- Keep names descriptive and scoped to the file's purpose.
- Prefer explicit suffixes (e.g., `*.component.ts`, `*.service.ts`) over generic names.
- Avoid abbreviations unless they are standard and unambiguous (e.g., `csv`).
- Rename files alongside any reference updates (imports, links, docs).
- Avoid `index.ts` barrels by default; prefer explicit imports for clarity and tree-shaking.
- When a file needs explicit versioning, append `-v{n}` and keep older versions until migrated.

## Angular and TypeScript

- Components: `feature-name.component.ts`, template `feature-name.component.html`, styles `feature-name.component.scss`.
- Services: `feature-name.service.ts`.
- Routes: `feature-name.routes.ts`.
- Guards/resolvers: `feature-name.guard.ts`, `feature-name.resolver.ts`.
- Interceptors: `feature-name.interceptor.ts`.
- Directives: `feature-name.directive.ts`.
- Pipes: `feature-name.pipe.ts`.
- Models/types: `feature-name.model.ts`, `feature-name.type.ts`.
- Utilities: `feature-name.utils.ts` or `feature-name.helpers.ts` (pick one and be consistent).
- Tests: `feature-name.spec.ts`.

## Current app layout conventions

The app currently organizes code under `src/app/` by role:

- `components/` for reusable UI components.
- `pages/` for route-level pages.
- `services/` for data access and state services.
- `models/` for shared domain types.
- `utils/` for helpers and pure utilities.

If you introduce a new top-level folder, document the rationale and update `index.md`.

## Docs

- General docs: `docs/<area>/<topic>.md` in lower-case kebab-case.
- ADRs: `docs/decisions/adr-YYYY-MM-DD-short-slug.md`.
- Plans: `docs/plans/<topic>-plan.md`.
- UX: `docs/ux/<topic>.md`.
- Prompts: `.github/prompts/<topic>.prompt.md`.
- Instructions: `.github/instructions/<topic>.instructions.md`.

## Data and archives

- Sample data: `docs/data/<topic>.csv`.
- Deprecated artifacts: `deprecated/docs/`, `deprecated/data/`, `deprecated/code/`.

## What changed / Why

- Added ASCII and versioning guidance to keep names consistent and durable.
- Documented the current `src/app/` layout so new folders stay aligned.

## Examples

- `src/app/pages/delivery-run.component.ts`
- `docs/architecture/architecture-overview.md`
- `docs/decisions/adr-2025-12-19-run-history-snapshots.md`
- `docs/plans/documentation-refresh-plan.md`
