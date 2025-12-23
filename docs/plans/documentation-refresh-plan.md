# Plan: Documentation Refresh and Validation

This plan refreshes and validates repo documentation so standards stay current, redundant docs are removed, and agents can navigate the codebase quickly.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-22
- **Type**: How-to
- **Scope**: documentation refresh, validation, and pruning across the repo
- **Non-goals**: application code changes unrelated to documentation
- **Applies to**: `docs/` and root-level documentation

## Objective

Bring docs up to date with current code and standards while keeping the documentation surface area focused and easy to navigate for agents and contributors.

## Success criteria

- Every doc has a clear purpose and a single source of truth.
- Best-practices docs reflect current standards and config.
- Core product docs (README, architecture, UX, user guide, testing) match current behavior.
- Workflows and prompts reference the right standards and templates.
- `index.md` accurately maps doc locations and entry points.
- Deprecated or redundant docs are marked **Deprecated** and link to replacements.

## Constraints

- Use the docs prompt (`/docs`) for updates and alignment whenever possible.
- Follow `docs/dev/best-practices/documentation-style-guide.md` and file naming rules.
- Prefer existing docs over new files; reduce duplication instead of expanding it.
- If updated drafts conflict with current docs, trust the current docs and only adopt improvements.
- Validate claims against code and config; call out anything that cannot be verified.

## Milestones

- Milestone 1: Refresh best-practices docs and the documentation style guide.
- Milestone 2: Align core product docs with the codebase and data formats.
- Milestone 3: Align workflows and prompts, then update `index.md` and deprecations.

## Work breakdown

1. Inventory docs and map each to a single purpose; flag duplicates and candidates for deprecation.
2. Merge improvements from the updated draft docs into current best-practices standards.
3. Align README, architecture, UX, user guide, and testing docs using `doc: align`.
4. Audit workflows and prompts for alignment with updated standards.
5. Update `index.md` and cross-links; mark deprecated docs and link replacements.
6. Verify metadata and spot-check for stale claims or broken references.

## Risks and mitigations

- Risk: outdated claims remain after refresh.
  - Mitigation: align with code/config and add explicit notes for unverified areas.
- Risk: documentation sprawl makes onboarding harder.
  - Mitigation: enforce doc purpose, deprecate redundant docs, and keep `index.md` current.

## Open questions

- Should we upgrade Angular to v20+ to match the Angular standards doc?
- Do we want markdownlint and link checks in CI?

## Related docs

- `docs/dev/workflows/docs.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `index.md`
