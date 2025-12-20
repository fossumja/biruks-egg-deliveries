# Documentation Refresh Plan

This plan lists the documents to create/update now. We will work through each file one by one, double‑checking the codebase and current docs before editing, and incorporating research/best practices as they come in.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: How-to
- **Scope**: documentation refresh and best-practices rollout
- **Non-goals**: implement code changes unrelated to documentation
- **Applies to**: `docs/` and root-level documentation

## Goals

- Establish clear, reusable best‑practice guidance for agents and contributors.
- Align all docs with the current repo structure and feature set.
- Keep the repository index (`index.md`) accurate as structure evolves.

## Research needed (to inform drafting)

- [ ] File naming conventions and repository layout best practices for Angular/TS projects.
  - Project preference: all lower‑case, kebab‑case filenames and folder names; avoid spaces. If this conflicts with best practice, follow best practice and document the deviation.
- [ ] Angular v20+ best practices (standalone components, signals, routing, and performance).
  - Project preference: always target the latest Angular and adjust standards per release; record version-specific rules in `docs/dev/best-practices/angular-standards.md`. If this conflicts with best practice, follow best practice and document the deviation.
- [ ] Angular release cadence and migration guides (deprecations, required practices per version).
  - Project preference: prioritize forward‑compatible patterns over legacy APIs; document any temporary exceptions. If this conflicts with best practice, follow best practice and document the deviation.
- [ ] TypeScript strictness and typing guidelines for app-scale projects.
  - Project preference: no `any` in app code; prefer `unknown` and narrow; document acceptable exceptions. If this conflicts with best practice, follow best practice and document the deviation.
- [ ] Accessibility standards for web apps (WCAG AA focus, ARIA patterns).
  - Project preference: prioritize mobile PWA usage and large touch targets; document UI patterns for accessible swipe/drag. If this conflicts with best practice, follow best practice and document the deviation.
- [ ] Documentation style guidelines for developer-facing and user-facing docs.
  - Project preference: keep docs concise, task‑oriented, and scoped to this repo; include “what changed/why” when updating. If this conflicts with best practice, follow best practice and document the deviation.
- [ ] Testing strategy references (unit vs. integration vs. scenario/E2E).
  - Project preference: emphasize scenario tests that mirror real delivery flows; document when to add or update scenarios. If this conflicts with best practice, follow best practice and document the deviation.
- [ ] Operational runbook basics (deployment, backup/restore, incident response).
  - Project preference: include simple, repeatable steps for non‑developer use; avoid external dependencies where possible. If this conflicts with best practice, follow best practice and document the deviation.
- [ ] CSV import/export documentation patterns (schemas, versioning, compatibility).
  - Project preference: backward‑compatible imports, additive exports, and explicit versioning when formats change. If this conflicts with best practice, follow best practice and document the deviation.

## Worklist (in order)

### Developer best practices

- [x] docs/dev/best-practices/file-naming.md
- [x] docs/dev/best-practices/angular-standards.md
- [x] docs/dev/best-practices/typescript-standards.md
- [x] docs/dev/best-practices/documentation-style-guide.md
- [x] docs/dev/best-practices/testing-practices.md
- [x] docs/dev/best-practices/accessibility.md

### Developer workflows

- [x] docs/dev/workflows/development.md
- [x] docs/dev/workflows/docs.md
- [x] docs/dev/workflows/quality.md
- [x] docs/dev/workflows/release.md
- [x] docs/dev/workflows/triage.md

### Reference material

- [x] docs/reference/data-model.md
- [x] docs/reference/csv-format.md
- [x] docs/reference/glossary.md

### Operations

- [x] docs/ops/deployment.md
- [x] docs/ops/backup-restore.md
- [x] docs/ops/runbook.md

### Repo-wide doc metadata alignment

- [x] Apply the required doc header metadata to all human-facing docs in `docs/` and root docs.
- [x] Update ADR statuses to match the documentation style guide (Draft | Review | Stable | Deprecated).

### Core product docs (review + align)

- [x] docs/architecture/architecture-overview.md
- [x] docs/ux/ux-overview.md
- [x] docs/ux/style-guide.md
- [x] docs/testing/regression-tests.md
- [x] docs/testing/usage-scenario-tests.md
- [x] docs/user/user-guide.md

### Root docs

- [x] README.md
- [x] AGENTS.md
- [x] index.md

### Deprecated docs

- [x] Add required doc headers to `deprecated/docs/*.md` and mark archived plans as Deprecated.
- [x] Link deprecated plans to their replacement docs where available.

## Working rules

- Update `index.md` if folder structure or doc placement changes.
- Keep naming lower‑case and kebab‑case for new docs.
- For each file: review existing content, cross‑check with code/ADRs, then update.
- Use the best‑practices docs in `docs/dev/best-practices/` as the source of truth for rules; update them instead of restating rules in other docs.
