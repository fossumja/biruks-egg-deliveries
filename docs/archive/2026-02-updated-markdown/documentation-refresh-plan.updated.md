# Documentation refresh plan

- **Status**: Draft
- **Owner**: (set per-repo)
- **Last updated**: 2025-12-19
- **Type**: Explanation
- **Scope**: plan to refresh repo documentation for accuracy, consistency, and markdownlint compliance
- **Applies to**: `docs/` and `.github/` documentation
- **Non-goals**: refactoring application code (tracked separately)

## Background

Docs have grown over time and now need a consistency pass:

- Ensure best-practices docs match current Angular/TypeScript guidance.
- Reduce duplicated rules across docs.
- Make docs easier to consume for humans and AI agents.
- Keep docs clean under markdownlint.

## Goals

- Establish stable, lint-safe doc templates and naming.
- Refresh best-practices docs first:
  - file naming and repo layout
  - Angular standards (v20+)
  - TypeScript standards
  - Accessibility standards
  - Testing practices (strategy only)
- Apply updated standards across workflows and ops docs in later phases.

## Non-goals

- Writing full user documentation for non-developers (separate effort).
- Migrating build/test tools as part of the doc refresh (document recommendations; schedule migrations separately).

## Proposed changes

1. **Normalize doc metadata and structure**  
   Reference: `docs/dev/best-practices/documentation-style-guide.md`.

2. **Update best-practices docs** to align with authoritative sources and repo standards:
   - `docs/dev/best-practices/file-naming.md`
   - `docs/dev/best-practices/angular-standards.md`
   - `docs/dev/best-practices/typescript-standards.md`
   - `docs/dev/best-practices/accessibility.md`
   - `docs/dev/best-practices/testing-practices.md`

3. **Add “Version watchlist” sections** to any doc that depends on rapidly-changing tooling.

## Risks and mitigations

- **Risk**: docs drift again after refresh  
  **Mitigation**: add “Version watchlist” and update docs during dependency upgrades.
- **Risk**: standards conflict across docs  
  **Mitigation**: keep canonical rules in best-practices docs and link from elsewhere.

## Rollout plan

- Phase 1: best-practices docs refresh (this plan).
- Phase 2: workflows and ops docs align to updated standards.
- Phase 3: add doc checks to CI (markdownlint + link checks) if desired.

## Open questions

- Should docs live alongside features (feature README) more than under `docs/`?
- When (if ever) should we migrate from Karma/Jasmine to a faster runner?
- Do we want an ADR requirement for major architecture decisions?
