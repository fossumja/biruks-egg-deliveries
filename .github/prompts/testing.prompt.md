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

## V-model alignment

- Ensure the issue test plan is approved before executing packs; stop and ask if it is missing.
- Record TP-xx pack IDs and usage-scenario IDs so they can be mapped into PR Traceability.
- If coverage changes, update `docs/testing/regression-tests.md` and note the change in the parent issue or PR.

## Procedure

## action=scope

1. Read `docs/testing/regression-tests.md` and `docs/dev/workflows/testing.md`.
2. Map changes to test packs using the change-impact map.
3. If change inputs are missing, ask for them once.
4. If the issue lacks an approved test plan, stop and request it before proceeding.
5. Output the recommended pack list and test tier.

## action=plan

1. Confirm the test tier and pack list.
2. Enumerate automated specs to add/update (paths).
3. Provide automated test commands, using `npm test -- --watch=false --browsers=ChromeHeadless --include <spec>` when possible.
4. List the manual checks required for each pack.
5. Call out any required fixtures or data resets.
6. If an issue is provided and the Testing plan section is missing or incomplete:
   - Update the issue body with the drafted plan.
   - Ask whether to mark the test plan approved (self-approval OK for solo work).

## action=run

1. Execute automated test commands in the planned order.
2. Report failures immediately with reproduction commands.
3. Summarize which manual checks remain.
4. Do not claim manual checks are complete unless explicitly confirmed.

## action=report

1. Summarize packs run (with TP-xx IDs), commands used, and outcomes.
2. Update docs when test coverage or packs changed, including automation notes in `docs/testing/regression-tests.md`.
3. Suggest follow-up issues for any failures.
4. Provide a short PR-ready evidence summary (AC coverage, TP-xx IDs, usage-scenario IDs, and known gaps).
5. If an issue is provided, add a short test-results comment or update the issue Testing plan/results section.

## Output

- Selected packs and test tier.
- Commands and manual checklist.
- Result summary and follow-up actions.

## Related docs

- `docs/dev/workflows/testing.md`
- `docs/testing/regression-tests.md`
- `docs/testing/usage-scenario-tests.md`
