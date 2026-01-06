# Reference: Agent Pack Portability

This reference defines which agent-facing files are intended to be portable across repos and which must stay project-specific. Use it when cloning or bootstrapping a new repo with the same agent workflows.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-05
- **Type**: Reference
- **Scope**: portability rules for agent prompts, workflows, and guidance
- **Non-goals**: project UX specs, app requirements, or stack-specific implementation details
- **Applies to**: agent prompts, workflows, and best-practice docs

## Summary

Treat the agent pack as two layers: a portable core and a project overlay. The portable core can be copied between repos; the project overlay must be updated for each repo to prevent cross-project mistakes.

## Portable core

These files are intended to copy across repos when the workflow is shared:

- `.github/prompts/`
- `docs/dev/workflows/`
- `docs/dev/best-practices/`
- `docs/dev/workflows/prompts.md`
- `docs/dev/workflows/docs.md`
- `AGENTS.md` (as a base template only; update project-specific sections)

Only copy `.github/instructions/` when the target repo uses the same tech stack and standards. Otherwise, replace with stack-appropriate instructions.

## Project overlay (must be repo-specific)

These files must be updated per repo before running any mutating workflows:

- `docs/reference/project-profile.md`
- `.github/instructions/project-standards.instructions.md`
- `.github/pull_request_template.md`
- `docs/architecture/`, `docs/ux/`, `docs/reference/`, `docs/testing/`, `docs/ops/` (project behavior and data)
- `README.md`, `index.md`

## Copy checklist

Use this checklist after copying the portable core:

- Add or update `docs/reference/project-profile.md` with the new repo ID, name, and defaults.
- Confirm prompt defaults reference the project profile for repo ID and base branch.
- Verify `.github/instructions/project-standards.instructions.md` matches the target stack.
- Update `README.md` and `index.md` for the new repo structure.
- Review `docs/reference/documentation-inventory.md` and add new entries.

## Risks

- Cross-repo edits can happen if repo ID or remote info is stale.
- Stack mismatches can cause prompts to enforce the wrong standards.
- Missing project overlay updates can invalidate testing or review steps.

## Related docs

- `docs/reference/project-profile.md`
- `docs/reference/documentation-inventory.md`
- `docs/dev/best-practices/agent-terminal-practices.md`
- `docs/dev/workflows/prompts.md`
- `docs/dev/workflows/bootstrap.md`
