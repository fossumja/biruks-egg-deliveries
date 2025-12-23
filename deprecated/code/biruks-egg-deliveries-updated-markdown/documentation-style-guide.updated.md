# Documentation style guide

- **Status**: Stable
- **Owner**: (set per-repo)
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: how we write Markdown in this repo so docs are easy for humans and AI agents
- **Applies to**: all `*.md` under `docs/` and `.github/`
- **Non-goals**: UI design guidance (see `docs/ux/`)

## Goals

- Make documentation **easy to scan**, **easy to keep current**, and **safe for automation**.
- Prefer **task-oriented** docs over narrative walls of text.
- Keep docs **lint-clean** with markdownlint.

## Doc taxonomy (Diataxis)

Each doc should clearly fit one primary type:

- **Tutorial**: guided learning, linear steps, explains as you go.
- **How-to guide**: goal-focused steps to complete a task.
- **Reference**: facts, rules, options, APIs, standards.
- **Explanation**: rationale, tradeoffs, background, “why we do it this way”.

Reference: [Diataxis](https://diataxis.fr/).

## Required front matter (in-doc metadata)

Every doc must start with:

1. One H1 title
2. A short metadata list

Required fields:

- **Status**: Draft | Stable | Deprecated
- **Owner**: team or person (or “(set per-repo)”)
- **Last updated**: YYYY-MM-DD
- **Type**: Tutorial | How-to | Reference | Explanation
- **Scope**: what this doc covers
- **Applies to**: where/when it applies
- **Non-goals**: what it explicitly does not cover

Example:

```md
# {Title}

- **Status**: Stable
- **Owner**: {Owner}
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: {What this covers}
- **Applies to**: {Where/when it applies}
- **Non-goals**: {What it does not cover}
```

## Structure rules (scanable + agent-friendly)

### Headings

- Exactly **one** H1 (`# ...`) per file. (markdownlint MD025)
- Use H2 (`##`) for main sections.
- Keep heading text unique within a file. (markdownlint MD024)
- Avoid “Misc,” “Other,” or repeated “Notes” headings. Use a specific label.

References: [markdownlint MD025](https://github.com/DavidAnson/markdownlint/blob/v0.40.0/doc/md025.md), [markdownlint MD024](https://github.com/DavidAnson/markdownlint/blob/v0.40.0/doc/md024.md).

### Lists and spacing

- Surround headings, lists, and code blocks with blank lines.
- Use consistent list markers:
  - `-` for bullets
  - `1.` for ordered lists
- Indent nested bullets by 2 spaces.
- Keep list items parallel and short.

### Code blocks

- Always use fenced code blocks with a language tag.
- Prefer small, runnable snippets.
- Avoid placeholder ellipses (`...`) in code. Use clear comments instead.

### Inline HTML

- Avoid inline HTML in Markdown text (markdownlint MD033).
- If you need HTML examples, put them in fenced `html` code blocks.

Reference: [markdownlint MD033](https://github.com/DavidAnson/markdownlint/blob/v0.40.0/doc/md033.md).

### Links

- Prefer stable, canonical links (official docs and specs).
- When a rule depends on a source, add the link on the same line as the rule.

### “Changes” note for edits

When you change a standard or workflow, add a short **What changed / Why** note in the relevant doc section. Keep it to 2–5 bullets.

## Markdownlint rules we optimize for

These are the most common sources of friction and the rules we design docs around:

- **MD025**: one H1 per file
- **MD024**: no duplicate headings
- **MD033**: avoid inline HTML
- **MD013** (if enabled): keep line length reasonable by wrapping paragraphs (do not hard-wrap code)

## Writing rules (content)

### Prefer testable language

- Use **MUST / SHOULD / MAY** intentionally:
  - MUST: required for correctness or team consistency
  - SHOULD: default choice; deviations require rationale
  - MAY: optional; choose when it helps
- Avoid vague words like “simple,” “clean,” “obvious,” unless you define what it means here.

### One concern per doc

- Don’t mix standards, workflows, and reference formats in one file.
- If you need to cross-reference, link to the canonical doc.

### Keep docs close to code

- Prefer docs under `docs/` for standards and workflows.
- Prefer “next to the code” for feature-specific usage notes (short `README.md` inside a feature folder is OK).

## Templates

Use templates to keep docs consistent. Copy these and fill in the placeholders.

### Best-practices standard template

```md
# {Topic} standards

- **Status**: Draft
- **Owner**: {Owner}
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: {What this standard covers}
- **Applies to**: {Code/doc areas}
- **Non-goals**: {Excluded topics}

## Rules

## Do / Don’t

## Examples

## Common pitfalls

## Version watchlist
```

### Workflow template

```md
# {Workflow name}

- **Status**: Draft
- **Owner**: {Owner}
- **Last updated**: 2025-12-19
- **Type**: How-to
- **Scope**: {When to run this workflow and why}
- **Applies to**: {Who/where}
- **Non-goals**: {Excluded topics}

## Preconditions

## Steps

## Definition of done

## Troubleshooting
```

### Plan template

```md
# {Plan name}

- **Status**: Draft
- **Owner**: {Owner}
- **Last updated**: 2025-12-19
- **Type**: Explanation
- **Scope**: {Goal and constraints}
- **Applies to**: {Teams/areas}
- **Non-goals**: {What we are not doing}

## Background

## Goals

## Non-goals

## Proposed changes

## Risks and mitigations

## Rollout plan

## Open questions
```

### ADR template

```md
# ADR: {Decision title}

- **Status**: Draft
- **Owner**: {Owner}
- **Last updated**: 2025-12-19
- **Type**: Explanation
- **Scope**: {Decision and context}
- **Applies to**: {Code/doc areas}
- **Non-goals**: {Excluded topics}

## Context

## Decision

## Consequences

## Alternatives considered
```

## Common doc smells

- Large docs with no “Rules” or “Steps” section.
- Repeating the same standards in multiple places.
- Long paragraphs with multiple ideas. Split into bullets.
- Docs that describe a rule but don’t show an example.
