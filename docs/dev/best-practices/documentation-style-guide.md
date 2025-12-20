# Documentation Style Guide

This guide defines how to write and structure documentation in this repo so it stays consistent, scannable, and easy to maintain for humans and AI agents.

- **Status**: Stable
- **Owner**: (set per-doc)
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: writing and structuring Markdown docs in this repo
- **Non-goals**: tooling-specific setup steps (see repo tooling docs)
- **Applies to**: Markdown docs in `docs/`, root-level docs, and `.github/` prompts/instructions (see doc-type rules below)

## Goals

- Keep docs concise, task-oriented, and specific to this project.
- Make docs easy to scan, search, and navigate.
- Avoid duplicated rules; point to a single source of truth.
- Make docs easy to update when code or behavior changes.
- Make docs easy for AI agents to follow (explicit inputs, outputs, constraints, and steps).

## Audience

- Contributors (Angular/TypeScript developers)
- Reviewers (PR review, architecture, security)
- Operators (CI, deployments, runbooks)
- Stakeholders (high-level UX and behavior)

Assume the reader is competent but unfamiliar with the current decision context.

## Doc types in this repo

- **Docs** (most of `docs/` and root docs): follow the required header and templates below.
- **Prompts** (`.github/prompts/*.prompt.md`): keep the required YAML front matter; do not add doc metadata blocks.
- **Instructions** (`.github/instructions/*.instructions.md`): keep the required YAML front matter; do not add doc metadata blocks.

Prompts and instructions are still Markdown. If you lint them, decide one of these repo-wide approaches:

- Add a single H1 after front matter (recommended for scannability), or
- Configure markdownlint to allow front matter and relax H1-related rules for these paths.

## Prompt and instruction standards

### Prompt files (`.github/prompts/*.prompt.md`)

Naming:

- Use lower-case, kebab-case: `{topic}.prompt.md`
- Store only in `.github/prompts/`

Required YAML front matter:

- `name`: short, unique prompt name
- `description`: one-line summary of what the prompt does
- `argument-hint`: expected arguments and patterns (optional, but recommended if your runner supports it)
- `agent`: use `"agent"` when this prompt is intended to run in agent mode

Body structure (recommended):

1. One-sentence role line: `You are my {role} assistant.`
2. `## Goals`: outcomes the prompt should achieve
3. `## Inputs` (or `## Defaults`): expected inputs and assumptions
4. Optional action sections (`## action=...`) if the prompt supports actions
5. `## Output`: what the assistant should return

Template:

````md
---
name: "{name}"
description: "{one-line summary}"
argument-hint: "{inputs or actions}"
agent: "agent"
---

# Prompt: {name}

You are my {role} assistant.

## Goals

- ...

## Inputs

- ...

## Procedure

1. ...
2. ...

## Output

- ...
````

Workflow linkage:

- Every prompt should have a corresponding workflow doc in `docs/dev/workflows/` (or a domain-specific workflow doc).
- The workflow doc must link to the prompt, and the prompt should be referenced in the workflow’s “Related docs.”

### Instruction files (`.github/instructions/*.instructions.md`)

Naming:

- Use lower-case, kebab-case: `{topic}.instructions.md`
- Store only in `.github/instructions/`

Required YAML front matter (typical):

- `name`: short, unique instruction set name
- `description`: one-line summary
- `applyTo`: glob for where the instructions apply

Body structure (recommended):

- Brief overview sentence.
- Sectioned rules using `##` headings.
- Avoid step-by-step procedures. Prefer constraints and standards.

Template:

````md
---
name: "{name}"
description: "{one-line summary}"
applyTo: "{glob}"
---

# Instructions: {name}

{One sentence summary of what these instructions enforce.}

## Scope

- Applies to: ...
- Does not apply to: ...

## Standards

- ...

## Non-goals

- ...
````

## Documentation structure model

Organize content by intent (Diataxis):

- **Tutorial**: learning-by-doing (guided walkthrough)
- **How-to**: goal-oriented steps for a known task
- **Reference**: factual and complete; "what is true"
- **Explanation**: background and rationale; "why"

If a doc mixes types, split it or add explicit section labels.

## Source of truth and doc locations

These are the canonical pointers for discovering documentation:

- Repo structure and doc locations: `index.md`
- Naming conventions: `docs/dev/best-practices/file-naming.md`
- Architecture overview: `docs/architecture/architecture-overview.md`
- UX behavior: `docs/ux/ux-overview.md`
- Decisions (ADRs/RFCs): `docs/decisions/`

If you change file locations or add new doc areas, update `index.md`.

## Required header for human-facing docs

Every human-facing doc (root docs and `docs/`) must start with:

1. A single H1 title (`# Title`).
2. A short summary (1-3 sentences).
3. A "Doc metadata" block (simple Markdown, no front matter).

Rules:

- **MUST** have exactly one H1 (`# ...`) in a file. Additional sections must use `##` and below. (markdownlint: MD025)
- If you need to show example docs (including their own `# Title`), **MUST** put them inside fenced code blocks so markdownlint does not treat them as headings in the current file.

Prompts and instruction files keep their YAML front matter and should not include a doc metadata block.

Per-doc metadata template (for root docs and `docs/` only):

- **Status**: Draft | Review | Stable | Deprecated
- **Owner**: team or GitHub handle
- **Last updated**: YYYY-MM-DD
- **Type**: Tutorial | How-to | Reference | Explanation
- **Scope**: what this doc covers
- **Non-goals**: what this doc does not cover
- **Applies to**: package/app/module name(s), if relevant

Example:

- **Status**: Stable
- **Owner**: @your-handle
- **Last updated**: 2025-12-19
- **Type**: How-to
- **Scope**: local dev setup on macOS
- **Non-goals**: Windows setup, CI behavior
- **Applies to**: `apps/web`, `libs/shared`

## Standard section layout

Use the template that matches the doc type. When a template applies, its section order is the standard layout. The list below is the default for procedural docs.

- **Overview**: what this doc is for, and who it is for
- **When to use**: concrete situations where this doc applies
- **When not to use**: common misuses and what to do instead
- **Prerequisites**: what must already be true
- **Steps**: numbered steps for procedures (actionable and testable)
- **Outcomes**: what "done" looks like, including verification
- **Troubleshooting**: common failure modes and fixes
- **Related docs**: next steps, deeper context, adjacent topics

## Writing and content rules

### Clarity and scannability

- Prefer short paragraphs.
- Use headings so readers can scan.
- Prefer lists over dense prose when describing options, requirements, or steps.
- Put key constraints near the top (auth, env vars, network, permissions).

### One source of truth

- Don’t copy long blocks from other docs.
- Link to the canonical doc or code location.
- When a best practice changes, confirm the new standard first, then update the relevant best-practices doc before applying it elsewhere.

### Use concrete, testable language

- Prefer: "Run `npm test` and confirm all tests pass."
- Avoid: "Make sure tests look good."

### Define terms once

If a term is project-specific, define it in a glossary doc and link to it.

### AI agent friendly conventions

When a doc is meant to drive work (plans, workflows, testing, runbooks):

- Include explicit **Inputs**, **Outputs**, and **Constraints**.
- Prefer checklists when there is a repeatable verification step.
- Include copy/paste commands and expected output where practical.
- Include decision points as explicit bullet lists.

## Markdown structure rules (markdownlint-safe)

These rules exist to prevent common Markdown lint failures and rendering surprises with markdownlint.

### Headings

- Start each file with exactly one top-level heading (`# Title`). (MD041)
- **Only one H1 per file**. Do not use `#` anywhere else in that file. (MD025)
- Use ATX headings (`#`, `##`, `###`) consistently.
- Do not skip heading levels (e.g., `##` to `####`). (MD001)
- Always include a space after `#` in headings (`## Heading`, not `##Heading`). (MD018)
- Headings should be unique within a file to avoid duplicate anchors. (MD024)

If you truly need repeated headings in different sections, either:

- make them unique (for example: `## Troubleshooting: Auth`, `## Troubleshooting: CI`), or
- configure markdownlint with `no-duplicate-heading: { "siblings_only": true }` (repo decision)

### Blank lines

- Surround headings with a blank line before and after (except the first H1 at the top). (MD022)
- Surround lists with a blank line before and after. (MD032)
- Surround fenced code blocks with a blank line before and after. (MD031)
- Avoid multiple consecutive blank lines. (MD012)

### Lists

- Use `-` for unordered lists repo-wide. (MD004)
- Use consistent indentation for nested lists (2 spaces recommended). (MD005/MD007)
- Use exactly one space after list markers (`- item`, `1. item`). (MD030)
- Prefer lazy numbering (`1.` for each item) for long lists that might change.

### Code blocks

- Use fenced code blocks, not indented code blocks.
- Always specify a language (for example: `ts`, `html`, `css`, `scss`, `bash`, `json`, `yaml`, `diff`).
- For shell snippets meant to be copy/paste, avoid `$` prompts unless you are also showing output. (MD014)
- When documenting templates that include headings, always put them inside a fenced code block to avoid MD025/MD024 in the current doc.

### Whitespace

- No hard tabs. Use spaces. (MD010)
- No trailing whitespace. (MD009)
- End files with a single newline.

### Links

- Prefer relative links to files in the repo.
- Avoid empty links like `[text]()`. (MD042)

### Inline HTML

- Avoid raw inline HTML in Markdown. (MD033)
- Do not use angle-bracket placeholders like `<Thing>` in normal prose or headings. Use `{Thing}` or backticks instead.
- If the repo allows limited HTML (for example `br`), that must be an explicit markdownlint config decision (`allowed_elements`).

## Code and command samples

### General

- Introduce code samples with a short sentence describing what the sample does.
- Prefer minimal examples that demonstrate the point.
- Show expected output when it prevents confusion.

### Shell command style

Use `bash` fences and prefer copy/paste-friendly commands.

```bash
npm ci
npm test
```

### TypeScript examples

Keep examples small and aligned with codebase naming.

```ts
export interface AppConfig {
  apiBaseUrl: string;
}
```

## Diagrams, screenshots, and visuals

- Prefer Mermaid for lightweight diagrams when supported by your doc renderer.
- For screenshots:
  - Include only what's necessary to explain the point.
  - Blur/redact secrets.
  - Add a caption describing what the reader should notice.

## Decision records (ADRs) and proposals (RFCs)

- Decisions belong in `docs/decisions/`.
- Each decision record must be linkable from the appropriate index.

Decision docs should include:

- Context
- Decision
- Alternatives considered
- Consequences (positive and negative)
- Follow-ups / migration plan (if applicable)

## Templates

Use these templates when creating new docs. Keep the required header format for human-facing docs.

Notes:

- Templates are shown inside fenced code blocks so this guide stays lint-clean (avoids MD025/MD024).
- Placeholders use `{like this}` to avoid MD033 inline HTML.
- Some templates contain nested fenced blocks. For those, the outer fence uses four backticks.

### Template: How-to guide

````md
# How-to: Do X

1-3 sentence summary.

- **Status**: Draft
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: How-to
- **Scope**: {what this doc covers}
- **Non-goals**: {what this doc does not cover}
- **Applies to**: {packages/modules}

## Goal

What you will accomplish.

## Prerequisites

- ...

## Steps

1. ...
2. ...

## Outcomes

How to verify success.

## Troubleshooting

- Symptom:
  - Cause:
  - Fix:

## Related docs

- ...
````

### Template: Reference

````md
# Reference: {Component / API / Config}

1-3 sentence summary.

- **Status**: Draft
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: Reference
- **Scope**: {what this doc covers}
- **Non-goals**: {what this doc does not cover}
- **Applies to**: {packages/modules}

## Summary

A tight description of what this thing is.

## Contract

### Inputs

- ...

### Outputs

- ...

### Errors

- ...

## Configuration

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

## Examples

```ts
// ...
```

## Related docs

- ...
````

### Template: Explanation

````md
# Explanation: Why we do X

1-3 sentence summary.

- **Status**: Draft
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: Explanation
- **Scope**: {what this doc covers}
- **Non-goals**: {what this doc does not cover}
- **Applies to**: {packages/modules}

## Context

What problem space we are in.

## Why this exists

What motivated the approach.

## Tradeoffs

- Benefits:
- Costs:
- Risks:

## Alternatives

- Option A:
- Option B:

## Related docs

- ...
````

### Template: Plan

````md
# Plan: X

1-3 sentence summary.

- **Status**: Draft
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: How-to
- **Scope**: {what this plan covers}
- **Non-goals**: {what this plan does not cover}
- **Applies to**: {packages/modules}

## Objective

What we are trying to achieve.

## Success criteria

- ...

## Constraints

- ...

## Milestones

- Milestone 1:
- Milestone 2:

## Work breakdown

1. ...
2. ...

## Risks and mitigations

- Risk:
  - Mitigation:

## Open questions

- ...

## Related docs

- ...
````

### Template: Workflow / Runbook

````md
# Runbook: X

1-3 sentence summary.

- **Status**: Draft
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: How-to
- **Scope**: {what this runbook covers}
- **Non-goals**: {what this runbook does not cover}
- **Applies to**: {packages/modules}

## Triggers

When to use this runbook.

## Preconditions

What must be true before executing.

## Procedure

1. ...
2. ...

## Rollback

How to undo changes safely.

## Verification

How to confirm the system is healthy.

## Escalation

Who to notify and what information to provide.

## Related docs

- ...
````

### Template: Test plan

````md
# Test Plan: X

1-3 sentence summary.

- **Status**: Draft
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: How-to
- **Scope**: {what is covered}
- **Non-goals**: {what is not covered}
- **Applies to**: {packages/modules}

## Scope

What is covered and what is not.

## Test strategy

Unit / integration / e2e / manual.

## Environments

- Local:
- CI:
- Staging:

## Test cases

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

## Acceptance criteria

- ...

## Reporting

Where results are recorded and how failures are triaged.

## Related docs

- ...
````

### Template: UX spec

````md
# UX Spec: X

1-3 sentence summary.

- **Status**: Draft
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: Explanation
- **Scope**: {what UX behavior is specified}
- **Non-goals**: {what is out of scope}
- **Applies to**: {packages/modules}

## Problem statement

What user problem are we solving.

## Users and scenarios

- Persona:
- Scenario:

## Requirements

### Functional

- ...

### Non-functional

- Accessibility:
- Performance:

## UX behavior

- Happy path:
- Empty states:
- Error states:

## Content and microcopy

- ...

## Analytics (if applicable)

- Event:
- Properties:

## Open questions

- ...

## Related docs

- ...
````

### Template: README (package/app)

````md
# {Package/App Name}

1-3 sentence summary.

- **Status**: Stable
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: Reference
- **Scope**: {what this package/app is for}
- **Non-goals**: {what it is not for}
- **Applies to**: {packages/modules}

## Quick start

```bash
npm ci
npm run start
```

## Key commands

- `npm test`: {what it does}
- `npm run lint`: {what it does}
- `npm run build`: {what it does}

## Configuration

- ...

## Architecture notes

- ...

## Related docs

- ...
````

### Template: ADR (decision record)

````md
# ADR: {Decision title}

1-3 sentence summary of the decision.

- **Status**: Draft | Accepted | Superseded
- **Owner**: @your-handle
- **Last updated**: YYYY-MM-DD
- **Type**: Explanation
- **Scope**: {what this decision affects}
- **Non-goals**: {what this decision does not address}
- **Applies to**: {packages/modules}

## Context

What situation led to this decision.

## Decision

What we decided.

## Rationale

Why this decision is preferred.

## Alternatives considered

- A:
- B:

## Consequences

- Positive:
- Negative:
- Migration/rollout:

## Related docs

- ...
````

## Tooling and enforcement

This guide is markdownlint-compatible. If markdownlint is enabled in your editor or CI, these rules align with common defaults.

Baseline rules implied by this guide:

- Single H1 title per file and consistent heading levels. (MD041/MD001/MD025)
- Blank lines around lists and fenced code blocks. (MD032/MD031)
- No trailing whitespace and no hard tabs. (MD009/MD010)
- Avoid inline HTML and angle-bracket placeholders. (MD033)
- Prefer language tags on fenced code blocks.

If you add stricter rules (like line length), document exceptions and provide an auto-format path.

## Maintenance

- Update docs alongside code changes, not after the fact.
- Update `index.md` when doc locations change.
- Mark stale docs as **Deprecated** and link to the replacement.
