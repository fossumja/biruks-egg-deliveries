# Agent Terminal Practices

This guide documents how agents should choose and run terminal commands in this repo, especially when local editor settings are shared. It is meant to evolve as we learn more.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-03
- **Type**: Reference
- **Scope**: terminal command selection, approvals, and settings alignment
- **Non-goals**: redefining system or developer instructions, changing sandbox rules
- **Applies to**: agent sessions running in this repo

## Summary

Use editor settings as guidance when they are provided, but do not treat them as authoritative over sandbox or approval rules. Prefer commands that align with the auto-approve list to reduce prompts, and ask before running unusual or destructive commands. For high-risk actions, warn the user and get explicit confirmation before proceeding.

## Inputs

- Optional: user-shared editor settings (for example `settings.json` snippets).
- Active sandbox/approval policy reported by the environment.
- Repo prompts and agent instructions.

## Practices

### Multi-repo safety (multi-instance Codex)

When running 2–5 Codex instances across multiple clones, use a consistent, low-friction guard to prevent cross-repo mistakes:

- Use a short **repo ID** derived from the repo name (example: `biruks-egg-deliveries` → `BED`) and include it in confirmations for mutating actions.
- Before any mutating action (push/merge/issue edit/close/delete), confirm:
  - Repo ID + repo name
  - `cwd`
  - `git remote -v`
  - Current branch
  - Target issue/PR number (if applicable)
- Keep temp files repo-local (use `tmp/` under the repo root); avoid `/tmp` to prevent mixing across clones.
- Distinguish terminals per repo (window title, shell prompt prefix, or tmux pane name).
- If running multiple dev servers, use distinct ports (e.g., `ng serve --port 4201`).

### Command selection

- Prefer commands in the user’s `chat.tools.terminal.autoApprove` list when they accomplish the task.
- Use the repo-recommended tools first (for example `rg` for search).
- Keep commands minimal and scoped (avoid sweeping `find` or `git` operations unless needed).
- Prefer commands that are parseable by the approval rules engine (avoid wrapping multiple commands in a single `zsh -lc "<...>"` string when possible).
- Split multi-step work into separate commands so allowlists can match the real tool (`gh`, `git`, `npm`) directly.
- Use `--body-file` and temp files instead of complex heredocs inside quoted shells.
- Do not combine temp-file creation and `gh` calls in the same quoted command; run them as separate commands.
- Prefer temp files inside the repo (for example `tmp/` under the repo root) to avoid escalated permissions for `/tmp`.
- Avoid multi-command `zsh -lc` blocks that include `python3 - <<'PY'` heredocs; run the Python step as its own command.
- Do not embed `gh` calls inside a Python heredoc (`python3 - <<'PY'`) inside `zsh -lc`; split it into discrete `gh` and `python3` commands or use a repo script file.

### Approval and sandbox alignment

- Treat sandbox and approval policies as the source of truth, even if editor settings allow auto-approve.
- If a command requires escalation (network access, elevated filesystem), request it once with a clear justification.
- Avoid destructive commands unless explicitly requested.

### High-risk operations

Warn the user and obtain explicit confirmation before running commands that could cause irreversible repo or data changes.

- History rewrite tools (`git filter-repo`, BFG, rebasing shared branches).
- Force pushes or branch/tag deletions.
- Repository settings changes (branch protections, required checks, permissions).
- Large-scale deletions or resets (`git reset --hard`, `git clean -fdx`, `rm -rf`).
- Data purges or migrations that delete exports or user data.

When confirmation is needed, summarize the impact and offer a safer alternative (for example, a new clean repo or a non-destructive backup).

### Settings usage

- If a `settings.json` snippet is provided, confirm any assumptions you plan to rely on.
- Do not assume access to user settings unless they are shared in the current session.
- Record any deviations from settings and explain why.
- If VS Code uses `zsh -lc`, remember the inner command is opaque to prefix rules; structure commands so rule matching still works.

## Checklist for new sessions

1. Confirm the sandbox and approval policy from the environment context.
2. Note any provided editor settings that affect command approvals.
3. Choose tools that align with repo standards and the auto-approve list.
4. Ask before using commands outside the list unless required to complete the task.
5. Call out high-risk actions early and confirm the user wants to proceed.
6. Check for uncommitted changes before switching branches or starting new work, and ask the user how to proceed if the tree is dirty.
7. When possible, keep commands single-purpose so approval rules can match the real tool.

## Open questions

- Should we add a repo-level allowlist for commands beyond editor settings?
- Should we standardize a default retention for auto-approve lists across machines?

## What changed / Why

- Added a rule to avoid `gh` calls inside Python heredocs, which can trigger approval prompts.

## Related docs

- `AGENTS.md`
- `.github/instructions/project-standards.instructions.md`
- `docs/dev/best-practices/documentation-style-guide.md`
