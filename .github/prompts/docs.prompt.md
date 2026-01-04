---
name: "docs"
description: "Create or refresh project documentation (README, USER GUIDE, UX, Architecture) optimized for agent-first maintenance."
argument-hint: "action=baseline|update|create|adr|guide|align topic={decision} file={path} (shorthand: docs {action} {file|topic})"
agent: "agent"
---

# Prompt: docs

You are my documentation assistant.

## Goals

- Prefer Markdown; legacy `.txt` docs should be migrated to `.md` when touched.
- Optimize for AI agents and humans: clear structure, low ambiguity
- Keep code comments minimal; put rationale and workflow in docs
- Prefer existing repo docs over inventing new file names
- Keep `index.md` up to date when docs are added, removed, or moved
- Use `docs/dev/best-practices/documentation-style-guide.md` as the source of truth for doc structure and formatting.
- For `action=update` and `action=create`, apply the documentation style guide to the target file.
- If docs are required but deferred, create a doc child issue via the issues prompt and link it in the parent issue's **Docs impact** section.

## Shorthand

- `docs baseline` -> `action=baseline`
- `docs update {summary}` -> `action=update`
- `docs create {path}` -> `action=create file={path}`
- `docs guide {path}` -> `action=guide file={path}`
- `docs align {path}` -> `action=align file={path}`
- `docs adr {topic}` -> `action=adr topic={topic}`
- `doc: align {path}` and `doc: guide {path}` remain valid shorthands

## action=baseline

Create/update (only if missing or clearly outdated):

- `README.md` (what/why/how, dev setup, scripts, build/deploy, troubleshooting)
- `docs/user/user-guide.md` (day-to-day workflow for non-dev use)
- `docs/ux/ux-overview.md` (screen inventory and UX/styling notes)
- `docs/architecture/architecture-overview.md` (high-level modules, data flow, key tradeoffs)
- `index.md` (docs inventory and navigation)
- `CONTRIBUTING.md` (branching, PR rules, commit message rules, release flow) if it does not exist
- `SECURITY.md` / `CHANGELOG.md` only if requested or clearly missing for a release
- Avoid introducing ADRs unless explicitly requested

## action=update

Given a feature/change description:

- Update the relevant existing docs (README / docs/user/user-guide.md / docs/ux/ux-overview.md / docs/architecture/architecture-overview.md)
- Add/adjust diagrams in ASCII/Markdown (no fancy tooling unless asked)
- Keep changes small and consistent
- After updating, apply `doc: guide {file}` to enforce the documentation style guide

## action=align

Align a documentation file with the current codebase and related docs.

Inputs:
- `file=<path>` (required; supports shorthand `doc: align <file>`)

Procedure:
1. Read `docs/dev/best-practices/documentation-style-guide.md`.
2. Read the target file and list its key claims, workflows, and references.
3. Inspect relevant code and config to confirm current behavior:
   - UI: components, routes, templates, and styles under `src/app/`.
   - Data: models, schema references, and CSV formats.
   - Runtime: configuration files and assets that affect behavior.
   - Decisions: relevant ADRs or plans in `docs/decisions/` and `docs/plans/`.
4. Update the target file to match verified behavior and remove stale content.
5. Check for collateral doc drift:
   - Update impacted core docs in the same pass when confidence is high:
     - `README.md`
     - `docs/user/user-guide.md`
     - `docs/ux/ux-overview.md`
     - `docs/architecture/architecture-overview.md`
     - `index.md`
     - `AGENTS.md`
   - If you cannot update a related doc, call it out in the output with a reason.
6. Apply the style guide to the updated files (including required headers for human-facing docs).
7. Update `index.md` if doc locations or scope references change.

## action=adr

Write an ADR in `docs/decisions/adr-<yyyy-mm-dd>-<slug>.md` with:

- Context
- Decision
- Alternatives considered
- Consequences
- Follow-ups

### Special case: ADR from a PLAN file
If the input references a `*PLAN.md` file (for example: `docs: adr RUN-HISTORY-PLAN.md`), do this:
1) Read the plan and extract the high-level decisions (what was chosen and why).
2) Ensure those decisions are captured in the appropriate permanent docs:
   - `README.md` if it impacts usage or setup.
   - `docs/user/user-guide.md` if it impacts day-to-day workflow.
   - `docs/ux/ux-overview.md` if it impacts UI behavior.
   - `docs/architecture/architecture-overview.md` if it impacts data flow or architecture.
3) Write the ADR summarizing the decision, alternatives, and consequences.
4) Archive the original plan by moving it into `deprecated/docs/` (keep the filename the same).
   - Do not delete the plan; move it so history is preserved.

## action=guide

Apply the documentation style guide to an existing file.

Inputs:
- `file=<path>` (required; supports shorthand `doc: guide <file>`)

Procedure:
1. Read `docs/dev/best-practices/documentation-style-guide.md`.
2. Read the target file.
3. Detect the doc type:
   - If it is a doc in `docs/` or a root-level doc: add the required header and align structure to the appropriate template.
   - If it is a prompt/instruction file under `.github/`: keep YAML front matter and apply the prompt/instruction structure rules only.
4. Keep content intact where possible; restructure only to match required sections and rules.
5. Update `index.md` if doc locations change.

## action=create

Create a new doc using the documentation style guide.

Inputs:
- `file={path}` (required; supports shorthand `doc: create {file}`)

Procedure:
1. Read `docs/dev/best-practices/documentation-style-guide.md`.
2. Select the correct template based on doc type.
3. Create the file with the required header and metadata (for `docs/` and root docs).
4. Populate sections with the provided technical details; keep content concise and task-focused.
5. Apply `doc: guide {file}` to ensure formatting and structure compliance.
6. Update `index.md` if this introduces a new doc location or folder.

## Output

- Files created/updated
- Doc issue created/linked when docs are deferred
- Suggested next prompt (often `/release` or `/quality`)
