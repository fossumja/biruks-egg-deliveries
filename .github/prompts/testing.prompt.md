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
- Use stable pack IDs (TP-xx) in output and reporting.

## Inputs

- Change summary or file list.
- Desired test tier: smoke, targeted, or full regression.
- Optional pack list if already known.
- Optional issue number/URL to update the Testing plan section.

## Defaults

- Use the change-impact map in `docs/testing/regression-tests.md`.
- Follow `docs/dev/workflows/testing.md`.
- Prefer targeted packs unless the change is high risk.
- Include usage scenarios when running full regression.
- If an issue is provided and the test plan is missing, draft and write the plan into the issue.

## Canonical workflow references

- `docs/dev/workflows/testing.md`

## V-model alignment

- Ensure the issue test plan is approved before executing packs; stop and ask if it is missing.
- Record TP-xx pack IDs and usage-scenario IDs so they can be mapped into PR Traceability.
- If coverage changes, update `docs/testing/regression-tests.md` and note the change in the parent issue or PR.

## Procedure

## action=scope

1. Follow `docs/dev/workflows/testing.md` to map changes to packs and select a tier.
2. Require a change-impact summary and approved test plan before proceeding.
3. Output the recommended pack list and tier.

## action=plan

1. Follow `docs/dev/workflows/testing.md` to draft the issue test plan.
2. Enumerate automated specs, commands, and manual checks.
3. If the issue plan is missing, update it and ask to mark it approved.

## action=run

1. Follow `docs/dev/workflows/testing.md` to execute automated tests and manual checks.
2. Report failures with repro commands and note remaining manual checks.

## action=report

1. Follow `docs/dev/workflows/testing.md` to report packs, commands, outcomes, and updates.
2. Provide a PR-ready evidence summary and follow-up issues for failures.
3. Update the issue test results when applicable.

## Output

- Selected packs and test tier.
- Commands and manual checklist.
- Result summary and follow-up actions.

## Related docs

- `docs/dev/workflows/testing.md`
- `docs/testing/regression-tests.md`
- `docs/testing/usage-scenario-tests.md`
