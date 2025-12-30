# Documentation Workflow

Use this workflow to create or update docs in a consistent, markdownlint-safe way.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-30
- **Type**: How-to
- **Scope**: creating and updating documentation in this repo
- **Non-goals**: modifying application code or external tooling
- **Applies to**: `docs/`, root docs, `.github/prompts/`, `.github/instructions/`

## Trigger

- You are adding or updating any Markdown documentation in the repo.
- You are documenting a new decision, workflow, or reference.
- You need to align a doc with the current codebase after drift.

## Inputs

- Target file path.
- Doc type (docs, prompt, or instruction).
- Any new decisions or behavior changes to capture.
- Optional feature or screen scope to focus alignment.

## Constraints

- Follow `docs/dev/best-practices/documentation-style-guide.md`.
- Keep `index.md` up to date if doc locations or folders change.
- Use lower-case, kebab-case naming per `docs/dev/best-practices/file-naming.md`.
- When a best practice changes, confirm the new standard first, then update the relevant best-practices doc before applying it elsewhere.
- Prefer using the docs prompt (`/docs`). If a workflow lacks a prompt, create one and link it here.
- Prompts and instructions must include a single H1 after front matter per the style guide.

## Steps

1. If the doc appears out of sync with code, use the docs prompt align action:
   - `doc: align <file>` to inspect code and update the doc to match reality.
1. Use the docs prompt when possible:
   - For existing docs, start with `doc: guide <file>`.
1. Identify the doc type:
   - Human-facing docs in `docs/` or root use the required header and templates.
   - Prompts/instructions keep YAML front matter and skip doc metadata.
1. Apply the style guide:
   - Use the appropriate template.
   - Keep sections relevant; remove unused sections.
1. Add a short "What changed / Why" note when updating standards or workflows.
1. Update links and references:
   - Adjust any doc links affected by renames or moves.
1. Update `index.md` if folders or doc locations changed.
1. If a new decision is made:
   - Add an ADR in `docs/decisions/` using the ADR template.
1. Re-run a quick markdown pass:
   - Blank lines around headings and lists.
   - Single H1 and consistent heading levels.

## Checks

- `doc: guide <file>` applied for human-facing docs.
- References in `README.md`, `AGENTS.md`, and `index.md` are correct.
- No new markdownlint warnings for headings or lists.
- "What changed / Why" notes added for standards and workflow updates.
- Prompt/instruction updates include a single H1 after front matter.

## Outputs

- Updated doc(s) that follow the style guide.
- Updated `index.md` when applicable.
- ADR added if a decision was made.

## What changed / Why

- Added a reminder to include "What changed / Why" notes when updating standards or workflows.
- Added an explicit H1 requirement for prompt and instruction files to match the style guide.
- Added a checklist item to verify prompt/instruction H1s during doc updates.

## Related docs

- `.github/prompts/docs.prompt.md`
- `docs/dev/best-practices/documentation-style-guide.md`
- `docs/dev/best-practices/file-naming.md`
- `docs/plans/documentation-refresh-plan.md`
