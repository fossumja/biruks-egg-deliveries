# Best Practices: Agent Interaction

Guidance for using instructions, prompts, templates, and workflows together so agent-driven work stays reliable and traceable.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-04
- **Type**: Reference
- **Scope**: agent interactions and workflow discipline in this repo
- **Non-goals**: replacing system/developer instructions or code standards
- **Applies to**: prompts, workflows, issues, PRs, and agent-driven changes

## Core principles

- **Single source of truth**: use prompts for execution, workflows for end-to-end steps, and best-practices docs for standards.
- **V-model gates are mandatory**: design/ADR, test-plan approval, traceability, and validation evidence must be present before merge.
- **State-aware execution**: always detect current branch, working tree status, and existing PRs before acting.
- **Evidence first**: Review Evidence and Traceability must reflect tests and decisions actually taken.

## Prompt usage

- Use prompts as the primary interface for repeated workflows (`feature`, `issues`, `develop`).
- Keep prompts aligned with workflow docs; update the workflow whenever prompt behavior changes.
- When delegating, verify the target prompt is current before relying on it.
- Avoid duplicate prompts that do the same job; extend existing ones instead.
- Keep prompts concise, but require clear Inputs/Defaults/Stop conditions so short user commands stay safe.

## Structured issue intake (Markdown templates)

- Keep markdown templates in `.github/ISSUE_TEMPLATE/` as the source of truth for issue structure.
- Ensure new issues include the template sections for test plan, risk assessment, and review focus.
- Treat missing sections as a **refine** trigger, not a blocker:
  - Create the issue quickly if needed.
  - Immediately run `issues refine` to fill missing sections before implementation starts.
- Require artifacts when relevant (repro steps, logs/screenshots, data samples).

## Workflow hygiene

- Keep each prompt backed by a workflow doc in `docs/dev/workflows/`.
- Use issue templates for new work to keep test plans and review focus consistent.
- Update the prompt catalog (`docs/dev/workflows/prompts.md`) whenever prompts change.

## Prompt clarity checklist (for prompt files)

- **Must include**: Goals, Inputs or Defaults, Decision aids, Stop/ask conditions, Procedure, Output.
- **Should include**: Examples of shorthand usage.
- **Keep user input lightweight**: accept short commands and ask only for missing critical info.

## Prompt quality audit checklist (when adding or editing prompts)

- Structure matches the documentation style guide for prompts.
- Workflow linkage exists (prompt is referenced by the relevant workflow doc).
- Stop/ask conditions cover missing artifacts, ambiguous requirements, and high-risk actions.
- V-model gates are called out where applicable (test-plan approval, ADRs, traceability, validation).
- Prompt catalog updated if behavior or shorthand changed.
- Short user inputs still behave safely (decision aids + defaults handle ambiguity).

## Inputs and artifacts

- Require artifacts before implementation when needed:
  - UX direction (mockups or explicit styling direction)
  - Bug repro steps and logs/screenshots
  - Data samples (CSV/import/export) for data-flow changes
- If any artifact is missing, stop and request it.

## Context probes and session notes

- Always check: current branch, working tree cleanliness, and existing PR status before acting.
- When work spans multiple sessions, add a short **Current context** note in the parent issue or PR:
  - Active branch
  - Next child issue
  - Open decisions or missing artifacts

## Review evidence snippet (use in PR comments)

```
Review Evidence
- AC coverage: ...
- Tests: ...
- TP-xx packs: ...
- Manual checks: ...
- Traceability: ...
- Risks/gaps: ...
```

## Command and safety discipline

- Use one command per tool call; avoid multi-command `zsh -lc` strings.
- Separate `gh` calls from `python3` heredocs (use files or scripts).
- Treat destructive actions as high risk; warn and request explicit confirmation.

## Documentation discipline

- Update docs alongside behavior changes, not after.
- Update `index.md` whenever docs are added, moved, or removed.
- Use the documentation style guide for all human-facing docs.

## Common failure modes to avoid

- Skipping test-plan approval or ADR decisions.
- Closing issues before base checks pass.
- Merging without Review Evidence or Traceability.
- Creating new prompts without updating workflows and the prompt catalog.
- Proceeding without confirming branch/PR context or required artifacts.

## Related docs

- `AGENTS.md`
- `docs/dev/workflows/feature-delivery.md`
- `docs/dev/workflows/prompts.md`
- `docs/dev/best-practices/agent-terminal-practices.md`
- `docs/dev/best-practices/documentation-style-guide.md`
