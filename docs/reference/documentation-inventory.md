# Documentation Inventory

This catalog lists documentation, prompts, and instructions with their purpose and owner so the repo stays navigable and avoids duplicate sources of truth.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-05
- **Type**: Reference
- **Scope**: documentation inventory, purpose map, and deprecation tracking
- **Non-goals**: editing doc content or redefining standards
- **Applies to**: repository documentation

## Summary

Use this file to find the right doc quickly, confirm ownership, and spot duplicates that should be deprecated.

## Inventory

### Root docs

| Path | Purpose | Owner |
| --- | --- | --- |
| `README.md` | Project overview, setup, and key links. | repo maintainers |
| `AGENTS.md` | Agent behavior and repo guidance. | repo maintainers |
| `index.md` | Repo structure and documentation entry points. | repo maintainers |

### Product docs

| Path | Purpose | Owner |
| --- | --- | --- |
| `docs/architecture/architecture-overview.md` | Architecture overview and data flow. | repo maintainers |
| `docs/ux/ux-overview.md` | Screen inventory and UX behavior notes. | repo maintainers |
| `docs/ux/style-guide.md` | UX styling and visual guidance. | repo maintainers |
| `docs/user/user-guide.md` | Day-to-day user workflows. | repo maintainers |

### Developer best practices

| Path | Purpose | Owner |
| --- | --- | --- |
| `docs/dev/best-practices/angular-standards.md` | Angular standards for components, templates, routing, and DI. | repo maintainers |
| `docs/dev/best-practices/typescript-standards.md` | TypeScript strictness and typing patterns. | repo maintainers |
| `docs/dev/best-practices/testing-practices.md` | Testing strategy and priorities. | repo maintainers |
| `docs/dev/best-practices/accessibility.md` | Accessibility requirements and patterns. | repo maintainers |
| `docs/dev/best-practices/file-naming.md` | File and folder naming rules. | repo maintainers |
| `docs/dev/best-practices/documentation-style-guide.md` | Documentation structure and style rules. | repo maintainers |

### Developer workflows

| Path | Purpose | Owner |
| --- | --- | --- |
| `docs/dev/workflows/development.md` | Daily development flow and branch hygiene. | repo maintainers |
| `docs/dev/workflows/feature-delivery.md` | Feature delivery from issue breakdown to PR. | repo maintainers |
| `docs/dev/workflows/docs.md` | Documentation update workflow and prompt usage. | repo maintainers |
| `docs/dev/workflows/prompts.md` | Prompt catalog and usage guidance. | repo maintainers |
| `docs/dev/workflows/quality.md` | Quality gates and checks. | repo maintainers |
| `docs/dev/workflows/testing.md` | Testing workflow and scope selection. | repo maintainers |
| `docs/dev/workflows/release.md` | Release flow and checks. | repo maintainers |
| `docs/dev/workflows/triage.md` | Issue and PR triage steps. | repo maintainers |

### Reference and data

| Path | Purpose | Owner |
| --- | --- | --- |
| `docs/reference/agent-pack-portability.md` | Portable vs project-specific agent guidance. | repo maintainers |
| `docs/reference/data-model.md` | Data model reference for storage and export. | repo maintainers |
| `docs/reference/csv-format.md` | CSV schema and compatibility rules. | repo maintainers |
| `docs/reference/glossary.md` | Canonical terminology. | repo maintainers |
| `docs/reference/project-profile.md` | Repo identity and defaults used by prompts. | repo maintainers |
| `docs/data/BiruksEggDeliveries-2025-12-22.csv` | Sample data snapshot for reference. | repo maintainers |
| `docs/data/BiruksEggDeliveries-2025-12-17.csv` | Sample data snapshot for reference. | repo maintainers |

### Testing and ops

| Path | Purpose | Owner |
| --- | --- | --- |
| `docs/testing/regression-tests.md` | Regression test scenarios. | repo maintainers |
| `docs/testing/usage-scenario-tests.md` | End-to-end usage scenarios. | repo maintainers |
| `docs/ops/deployment.md` | Deployment steps and requirements. | repo maintainers |
| `docs/ops/backup-restore.md` | Backup and restore procedures. | repo maintainers |
| `docs/ops/runbook.md` | Operational runbook and escalation. | repo maintainers |

### Decisions and plans

| Path | Purpose | Owner |
| --- | --- | --- |
| `docs/decisions/adr-2025-12-19-backup-restore-roundtrip.md` | Decision record for backup and restore behavior. | repo maintainers |
| `docs/decisions/adr-2025-12-19-donation-totals-global-formula.md` | Decision record for donation totals formula. | repo maintainers |
| `docs/decisions/adr-2025-12-19-planner-swipe-front-back.md` | Decision record for planner swipe UI. | repo maintainers |
| `docs/decisions/adr-2025-12-19-run-history-snapshots.md` | Decision record for run history snapshots. | repo maintainers |
| `docs/plans/documentation-refresh-plan.md` | Active plan for documentation upgrades. | repo maintainers |

### Prompts

| Path | Purpose | Owner |
| --- | --- | --- |
| `.github/prompts/branch.prompt.md` | Branch creation and sync workflow. | repo maintainers |
| `.github/prompts/ci.prompt.md` | CI workflow creation and updates. | repo maintainers |
| `.github/prompts/commit.prompt.md` | Commit message preparation. | repo maintainers |
| `.github/prompts/deps.prompt.md` | Dependency update guidance. | repo maintainers |
| `.github/prompts/docs.prompt.md` | Documentation create, align, and guide actions. | repo maintainers |
| `.github/prompts/feature.prompt.md` | Feature delivery workflow. | repo maintainers |
| `.github/prompts/issues.prompt.md` | Issue creation and breakdown. | repo maintainers |
| `.github/prompts/labels.prompt.md` | Label taxonomy maintenance. | repo maintainers |
| `.github/prompts/pr.prompt.md` | PR creation and review workflow. | repo maintainers |
| `.github/prompts/project.prompt.md` | GitHub Projects maintenance. | repo maintainers |
| `.github/prompts/prompts.prompt.md` | Prompt discovery and listing. | repo maintainers |
| `.github/prompts/quality.prompt.md` | Quality checks and reporting. | repo maintainers |
| `.github/prompts/release.prompt.md` | Release workflow. | repo maintainers |
| `.github/prompts/repo.prompt.md` | Repo bootstrap and standardization. | repo maintainers |
| `.github/prompts/testing.prompt.md` | Modular testing scope selection. | repo maintainers |
| `.github/prompts/triage.prompt.md` | Issue and PR triage. | repo maintainers |

### Instructions

| Path | Purpose | Owner |
| --- | --- | --- |
| `.github/instructions/project-standards.instructions.md` | Angular, TypeScript, and accessibility standards for this repo. | repo maintainers |

## Deprecated and draft inputs

| Path | Purpose | Owner | Replacement |
| --- | --- | --- | --- |
| `deprecated/docs/README.md` | Archived readme content from earlier iterations. | repo maintainers | `README.md` |
| `deprecated/docs/task-breakdown.md` | Archived task breakdown notes. | repo maintainers | `docs/plans/documentation-refresh-plan.md` |
| `deprecated/docs/task-breakdown-styling.md` | Archived styling task notes. | repo maintainers | `docs/ux/style-guide.md` |
| `deprecated/docs/SWIPE-CARDS-PLAN.md` | Archived swipe cards planning notes. | repo maintainers | `docs/decisions/adr-2025-12-19-planner-swipe-front-back.md` |
| `deprecated/docs/BACKUP-RESTORE-PLAN.md` | Archived backup and restore plan. | repo maintainers | `docs/decisions/adr-2025-12-19-backup-restore-roundtrip.md` |
| `deprecated/docs/DONATION-TOTALS-PLAN.md` | Archived donation totals plan. | repo maintainers | `docs/decisions/adr-2025-12-19-donation-totals-global-formula.md` |
| `deprecated/docs/RUN-HISTORY-PLAN.md` | Archived run history plan. | repo maintainers | `docs/decisions/adr-2025-12-19-run-history-snapshots.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/accessibility.updated.md` | Draft accessibility improvements. | repo maintainers | `docs/dev/best-practices/accessibility.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/angular-standards.updated.md` | Draft Angular standards updates. | repo maintainers | `docs/dev/best-practices/angular-standards.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/angular-standards-fixed.md` | Draft Angular standards fixes. | repo maintainers | `docs/dev/best-practices/angular-standards.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/typescript-standards.updated.md` | Draft TypeScript standards updates. | repo maintainers | `docs/dev/best-practices/typescript-standards.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/testing-practices.updated.md` | Draft testing practices updates. | repo maintainers | `docs/dev/best-practices/testing-practices.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/file-naming.updated.md` | Draft file naming updates. | repo maintainers | `docs/dev/best-practices/file-naming.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/documentation-style-guide.updated.md` | Draft documentation style guide updates. | repo maintainers | `docs/dev/best-practices/documentation-style-guide.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/documentation-style-guide-fixed.md` | Draft documentation style guide fixes. | repo maintainers | `docs/dev/best-practices/documentation-style-guide.md` |
| `deprecated/code/biruks-egg-deliveries-updated-markdown/documentation-refresh-plan.updated.md` | Draft documentation refresh plan updates. | repo maintainers | `docs/plans/documentation-refresh-plan.md` |

## Maintenance

- Update this inventory when a doc is added, moved, or deprecated.
- Keep replacements current when deprecated docs change.

## Related docs

- `index.md`
- `docs/dev/workflows/docs.md`
- `docs/plans/documentation-refresh-plan.md`
