# Agent Terminal Practices

This guide documents how agents should choose and run terminal commands in this repo, especially when local editor settings are shared. It is meant to evolve as we learn more.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-30
- **Type**: Reference
- **Scope**: terminal command selection, approvals, and settings alignment
- **Non-goals**: redefining system or developer instructions, changing sandbox rules
- **Applies to**: agent sessions running in this repo

## Summary

Use editor settings as guidance when they are provided, but do not treat them as authoritative over sandbox or approval rules. Prefer commands that align with the auto-approve list to reduce prompts, and ask before running unusual or destructive commands.

## Inputs

- Optional: user-shared editor settings (for example `settings.json` snippets).
- Active sandbox/approval policy reported by the environment.
- Repo prompts and agent instructions.

## Practices

### Command selection

- Prefer commands in the user’s `chat.tools.terminal.autoApprove` list when they accomplish the task.
- Use the repo-recommended tools first (for example `rg` for search).
- Keep commands minimal and scoped (avoid sweeping `find` or `git` operations unless needed).

### Approval and sandbox alignment

- Treat sandbox and approval policies as the source of truth, even if editor settings allow auto-approve.
- If a command requires escalation (network access, elevated filesystem), request it once with a clear justification.
- Avoid destructive commands unless explicitly requested.

### Settings usage

- If a `settings.json` snippet is provided, confirm any assumptions you plan to rely on.
- Do not assume access to user settings unless they are shared in the current session.
- Record any deviations from settings and explain why.

## Checklist for new sessions

1. Confirm the sandbox and approval policy from the environment context.
2. Note any provided editor settings that affect command approvals.
3. Choose tools that align with repo standards and the auto-approve list.
4. Ask before using commands outside the list unless required to complete the task.

## Open questions

- Should we add a repo-level allowlist for commands beyond editor settings?
- Should we standardize a default retention for auto-approve lists across machines?

## Related docs

- `AGENTS.md`
- `.github/instructions/project-standards.instructions.md`
- `docs/dev/best-practices/documentation-style-guide.md`
