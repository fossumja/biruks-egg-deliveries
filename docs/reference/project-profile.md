# Reference: Project Profile

This profile captures repo-specific identifiers and defaults that prompts and workflows use to prevent cross-repo mistakes. Keep it current whenever the repo identity or default branch changes.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-05
- **Type**: Reference
- **Scope**: repo identity, defaults, and agent-safe confirmations
- **Non-goals**: secrets, credentials, or environment-specific values
- **Applies to**: prompts, workflows, and agent guardrails

## Summary

Use this file as the single source of truth for repo ID and default branch when confirming mutating actions.

## Profile

| Field | Value |
| --- | --- |
| Repo name | `biruks-egg-deliveries` |
| Repo ID | `BED` |
| GitHub repo | `fossumja/biruks-egg-deliveries` |
| Default branch | `main` |
| Primary package manager | `npm` |

## Usage

- Prompts and workflows should derive the repo ID from this file when present.
- Update this profile before starting work in a newly cloned repo.

## Maintenance

- Update the repo ID if the repo is renamed.
- Update the default branch if it changes in GitHub.
- Keep the GitHub repo slug in sync with the remote.

## Related docs

- `docs/reference/agent-pack-portability.md`
- `docs/dev/best-practices/agent-terminal-practices.md`
- `.github/prompts/feature.prompt.md`
