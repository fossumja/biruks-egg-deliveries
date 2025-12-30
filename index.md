# Repository Index

This file describes the folder layout for the entire repo and where new files should go. Keep it updated whenever folders or documentation locations change.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-23
- **Type**: Reference
- **Scope**: repository structure and documentation locations
- **Non-goals**: detailed file-by-file inventories
- **Applies to**: entire repository

## Top-level layout

- .github/: repo automation, standards, and workflow prompts.
  - .github/instructions/: coding standards and agent guidance.
  - .github/prompts/: workflow prompts for docs, quality, release, etc.
  - .github/workflows/: CI workflows.
- docs/: documentation hub.
  - docs/architecture/: architecture and data-flow docs.
  - docs/data/: sample data and backup CSVs for reference.
  - docs/dev/: developer guidance and standards.
    - docs/dev/best-practices/: conventions and best-practice docs.
    - docs/dev/workflows/: repeatable development workflows.
  - docs/decisions/: ADRs (design/architecture decisions).
  - docs/ops/: operational runbooks (deployment, backup/restore).
  - docs/plans/: active or legacy planning notes.
  - docs/reference/: stable reference material (schemas, formats, glossary).
  - docs/testing/: regression and scenario test plans.
  - docs/user/: user-facing guides.
  - docs/ux/: UX inventory and styling guidance.
- deprecated/: archived artifacts.
  - deprecated/docs/: deprecated documentation and plans.
  - deprecated/data/: deprecated data exports and samples.
  - deprecated/code/: deprecated or retired source (when applicable).
- src/: Angular application source code.
- public/: static assets, PWA manifest, and icons.
- scripts/: helper scripts for builds or tooling.
- dist/: build output (generated; do not edit).
- node_modules/: dependencies (generated; do not edit).

## Documentation entry points

- Project overview and setup: `README.md`
- Agent and repo standards: `AGENTS.md`, `.github/instructions/project-standards.instructions.md`
- User guide: `docs/user/user-guide.md`
- Architecture overview: `docs/architecture/architecture-overview.md`
- UX inventory and style system: `docs/ux/ux-overview.md`, `docs/ux/style-guide.md`
- Testing plans: `docs/testing/regression-tests.md`, `docs/testing/usage-scenario-tests.md`
- Developer standards: `docs/dev/best-practices/angular-standards.md`, `docs/dev/best-practices/typescript-standards.md`, `docs/dev/best-practices/testing-practices.md`, `docs/dev/best-practices/accessibility.md`, `docs/dev/best-practices/documentation-style-guide.md`
- Agent terminal practices: `docs/dev/best-practices/agent-terminal-practices.md`
- Developer workflows: `docs/dev/workflows/development.md`, `docs/dev/workflows/feature-delivery.md`, `docs/dev/workflows/docs.md`, `docs/dev/workflows/prompts.md`, `docs/dev/workflows/quality.md`, `docs/dev/workflows/testing.md`, `docs/dev/workflows/release.md`, `docs/dev/workflows/triage.md`
- Operations runbooks: `docs/ops/deployment.md`, `docs/ops/backup-restore.md`, `docs/ops/runbook.md`
- Reference docs: `docs/reference/data-model.md`, `docs/reference/csv-format.md`, `docs/reference/glossary.md`, `docs/reference/documentation-inventory.md`
- Documentation inventory: `docs/reference/documentation-inventory.md`
- Decisions (ADRs): `docs/decisions/`
- Active planning: `docs/plans/documentation-refresh-plan.md`
- Archived planning notes: `deprecated/docs/task-breakdown.md`, `deprecated/docs/task-breakdown-styling.md`

## Documentation purpose map

- Best practices (`docs/dev/best-practices/`): repo standards and single sources of truth.
- Workflows (`docs/dev/workflows/`): repeatable procedures with inputs, steps, and checks.
- Reference (`docs/reference/`): schemas, formats, and definitions.
- Plans (`docs/plans/`): temporary coordination notes; move to `deprecated/` when complete.
- Decisions (`docs/decisions/`): ADRs and lasting architectural decisions.
- UX (`docs/ux/`): behavior, screens, and style guidance.
- User (`docs/user/`): non-developer usage and day-to-day flows.
- Ops (`docs/ops/`): runbooks, backup/restore, and operational steps.
- Deprecated (`deprecated/`): historical artifacts; do not use for new work.

## Root-level files (by purpose)

- Entry documentation: project overview, setup, and key links.
- Agent instructions: repo-wide behavior and standards entry point.
- Repository index: this directory map.
- Build/tooling configuration: package and Angular/TypeScript config files.
- Legacy data exports: sample or backup CSVs kept at root (prefer docs/data for new data files).
