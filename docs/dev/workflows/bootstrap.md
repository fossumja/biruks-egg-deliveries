# How-to: Bootstrap a New Repo

Use this guide to copy the agent workflow pack into a new project and customize the repo-specific overlay so prompts, workflows, and guardrails stay accurate.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-05
- **Type**: How-to
- **Scope**: initializing a new repo with the portable agent pack
- **Non-goals**: installing dependencies or configuring CI for the app itself
- **Applies to**: new Angular/TypeScript repos

## Overview

This workflow copies the portable core, applies the project overlay, and records the repo profile so agents do not confuse repositories when multiple instances are active.

## When to use

- You are starting a new Angular/TypeScript repo and want the same agent workflows.
- You want prompts and workflows to behave consistently across repos.

## When not to use

- You are only making a small change to an existing repo.
- The target repo is not Angular/TypeScript and needs different standards.

## Prerequisites

- A new repo initialized (local clone available).
- Access to the source repo that contains the agent pack.

## Steps

1. Copy the portable core into the new repo:
   - `.github/prompts/`
   - `docs/dev/workflows/`
   - `docs/dev/best-practices/`
   - `docs/dev/workflows/prompts.md`
   - `docs/dev/workflows/docs.md`
   - `AGENTS.md` (as a base template)
2. Create/update the project overlay:
   - `docs/reference/project-profile.md` (repo name, repo ID, default branch)
   - `.github/instructions/project-standards.instructions.md` (confirm Angular/TS standards)
   - `.github/pull_request_template.md` (project-specific defaults)
   - `README.md`, `index.md`
   - `docs/architecture/`, `docs/ux/`, `docs/reference/`, `docs/testing/`, `docs/ops/`
3. Update documentation references:
   - Add new docs to `docs/reference/documentation-inventory.md`.
   - Update `index.md` to reflect new or renamed doc locations.
4. Verify guardrails are correct:
   - Ensure prompts read repo ID from `docs/reference/project-profile.md`.
   - Confirm branch and PR workflows reference the correct default branch.
5. Record maintenance expectations:
   - If you change prompt behavior, update the matching workflow doc.
   - If you add a new prompt, update `docs/dev/workflows/prompts.md`.

## Outcomes

- Prompts and workflows behave correctly for the new repo.
- Repo-specific identifiers are captured in the project profile.
- Documentation inventory and index reflect the new structure.

## Maintenance

- Keep this workflow updated when the agent pack changes.
- If a new workflow or prompt is added, update this doc and the inventory.

## Related docs

- `docs/reference/agent-pack-portability.md`
- `docs/reference/project-profile.md`
- `docs/reference/documentation-inventory.md`
- `docs/dev/workflows/prompts.md`
