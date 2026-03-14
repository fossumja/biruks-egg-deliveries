# File naming and repo layout

- **Status**: Stable
- **Owner**: (set per-repo)
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: file/folder naming and documentation placement for this repo
- **Applies to**: `src/`, `docs/`, `.github/`
- **Non-goals**: build tooling configuration (see `docs/dev/workflows/`)

## Rules

### Naming basics

- Use **lower-case kebab-case** for folders and file basenames.
- Prefer **descriptive names** over abbreviations.
- Avoid spaces; avoid punctuation other than `-` and `.`.
- Use **ASCII** characters only.
- If a name needs a version, append `-v{n}` (example: `csv-format-v2.md`) and keep older versions in place until migrated.

References: [Angular style guide](https://angular.dev/style-guide) (naming), [Angular file structure](https://angular.dev/guide/file-structure).

### Angular/TypeScript source files

Follow Angular CLI conventions and suffix ordering:

- Components: `{feature}.component.ts` and `{feature}.component.html|scss`
- Routes: `{feature}.routes.ts` (feature route definitions)
- Services: `{topic}.service.ts`
- Guards/resolvers: `{topic}.guard.ts`, `{topic}.resolver.ts`
- Interceptors: `{topic}.interceptor.ts`
- Pipes: `{topic}.pipe.ts`
- Directives: `{topic}.directive.ts`
- Models/types:
  - Prefer `{topic}.ts` for **exported domain types**
  - Use `{topic}.types.ts` only when the file is *only* types and would otherwise be confusing

Rules:

- Match file name to the primary export.
- Avoid `index.ts` barrel files by default (they can harm tree-shaking and make imports ambiguous). Prefer explicit imports.
- Co-locate template and styles with their component.

References: [Angular style guide](https://angular.dev/style-guide), [Angular file structure](https://angular.dev/guide/file-structure).

### Folder structure

Default to **feature-first** organization (most stable as the app grows):

- `src/app/features/` for route-level features
- `src/app/shared/` for reusable UI, pipes, and directives
- `src/app/core/` for app-wide singleton services, providers, and shell layout
- `src/app/data-access/` for API clients, repositories, and caching
- `src/app/testing/` for shared test utilities (if needed)

Rules:

- A folder name should reflect **why code changes together** (features) more than *what the code is* (layers).
- A feature folder may contain subfolders like `components/`, `data-access/`, `routes/`, `ui/`, `util/` if it improves clarity.
- Prefer lazy-loaded feature routes for route-level features.

Reference: [Angular file structure](https://angular.dev/guide/file-structure).

### Documentation files

All docs use kebab-case, and the file name should match the doc type.

- Best practices: `docs/dev/best-practices/{topic}.md`
- Workflows: `docs/dev/workflows/{topic}.md`
- Plans: `docs/plans/{topic}-plan.md`
- ADRs: `docs/adr/{yyyy}-{mm}-{dd}-{short-title}.md`
- Runbooks: `docs/ops/{topic}.md`
- Reference: `docs/reference/{topic}.md`
- UX: `docs/ux/{topic}.md`

Rules:

- Use one H1 per doc (markdownlint MD025).
- Avoid duplicate headings within a doc (markdownlint MD024).
- Avoid inline HTML (markdownlint MD033).

Reference: [Documentation Style Guide](../best-practices/documentation-style-guide.md).

### GitHub prompts and instructions

- Prompt files: `.github/prompts/{topic}.prompt.md`
- Instructions: `.github/instructions/{topic}.instructions.md`

Rules:

- Keep these files small and purpose-built.
- Prefer one prompt per intent (example: `refactor.prompt.md`, not `general.prompt.md`).

Reference: [Documentation Style Guide](../best-practices/documentation-style-guide.md).

## Examples

### Feature routes

- `src/app/features/deliveries/deliveries.routes.ts`
- `src/app/features/deliveries/pages/deliveries-page.component.ts`
- `src/app/features/deliveries/data-access/deliveries-api.service.ts`

### Docs

- `docs/dev/best-practices/angular-standards.md`
- `docs/dev/workflows/release.md`
- `docs/plans/documentation-refresh-plan.md`
- `docs/adr/2025-12-19-csv-schema-versioning.md`

## Common pitfalls

- Mixing feature-first and layer-first structures without a clear rule.
- Re-exporting everything through barrels (`index.ts`) and making import graphs hard to reason about.
- Using inconsistent suffixes (example: `service.ts` vs `.service.ts`).
