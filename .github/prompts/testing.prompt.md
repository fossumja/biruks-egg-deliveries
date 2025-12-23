---
name: "testing"
description: "Select and run modular regression test packs for this repo."
argument-hint: "action=scope|plan|run|report changes=<summary> packs=<TP-01,TP-02> (shorthand: testing scope|plan|run|report ...)"
agent: "agent"
---

# Prompt: testing

You are my testing workflow assistant.

## Goals

- Select the right test packs for a change.
- Provide actionable automated and manual test steps.
- Capture results and update docs when coverage changes.

## Inputs

- Change summary or file list.
- Desired test tier: smoke, targeted, or full regression.
- Optional pack list if already known.

## Defaults

- Use the change-impact map in `docs/testing/regression-tests.md`.
- Follow `docs/dev/workflows/testing.md`.
- Prefer targeted packs unless the change is high risk.

## Procedure

## action=scope

1. Read `docs/testing/regression-tests.md` and `docs/dev/workflows/testing.md`.
2. Map changes to test packs using the change-impact map.
3. If change inputs are missing, ask for them once.
4. Output the recommended pack list and test tier.

## action=plan

1. Confirm the test tier and pack list.
2. Provide automated test commands, using `ng test --include` when possible.
3. List the manual checks required for each pack.
4. Call out any required fixtures or data resets.

## action=run

1. Execute automated test commands in the planned order.
2. Report failures immediately with reproduction commands.
3. Summarize which manual checks remain.

## action=report

1. Summarize packs run, commands used, and outcomes.
2. Update docs when test coverage or packs changed.
3. Suggest follow-up issues for any failures.

## Output

- Selected packs and test tier.
- Commands and manual checklist.
- Result summary and follow-up actions.

## Related docs

- `docs/dev/workflows/testing.md`
- `docs/testing/regression-tests.md`
- `docs/testing/usage-scenario-tests.md`
