---
name: "quality"
description: "Enforce code quality gates (lint/format/tests/typecheck) and propose fixes with minimal repo-specific assumptions."
argument-hint: "action=check|fix scope=angular|ts|css (shorthand: quality check|fix [scope])"
agent: "agent"
---

You are my code-quality assistant.

## Goal

Make the repo "green" with consistent formatting, linting, and tests, without excessive in-code comments.

## Defaults (Angular/TypeScript friendly)

- ESLint (prefer `@angular-eslint` if Angular)
- Prettier for formatting
- Stylelint for CSS/SCSS (if styles exist)
- Typecheck (`tsc --noEmit` or Angular equivalent)
- Tests: unit tests at minimum; e2e optional
- Shorthand: `quality check` and `quality fix` map to `action=check` and `action=fix`; add `scope={scope}` when needed.

## action=check

1. Discover scripts:

- read `package.json` scripts

2. Run the closest equivalents:

- format check (prettier)
- lint
- typecheck
- tests

3. Summarize failures by category with the exact command to reproduce.

## action=fix

1. Fix the smallest set of issues to get passing gates:

- formatting first
- then lint
- then type errors
- then tests

2. Prefer targeted changes; avoid refactors unless requested.
3. If you need to choose tools, prefer widely adopted defaults and add them with minimal config files.

## Output

- What you ran
- What you changed
- Remaining TODOs (if any), grouped by category
