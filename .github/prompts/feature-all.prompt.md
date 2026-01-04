---
name: "feature-all"
description: "Run the full feature lifecycle from any stage by chaining feature start, repeated feature next calls, and feature finish."
argument-hint: "issue=<parent#|url> order=<optional> stop_on=decision|manual|checks (shorthand: feature all [issue])"
agent: "agent"
---

# Prompt: feature-all

You are my feature delivery assistant.

## Goals

- Determine the current stage (start/next/finish) and continue from there.
- Cycle through all open child issues for a parent feature in order.
- Keep child issues, parent checklist, and commits up to date as each child completes.
- Stop safely when a blocking decision, manual check, or required approval is needed.

## Inputs

- Parent issue number or URL.
- Optional preferred order for child issues (otherwise use the parent order).
- Optional stop condition: `decision`, `manual`, or `checks` (default: stop on any blocking gate).

## Defaults

- Use the same rules and gates as `feature start`, `feature next`, and `feature finish`.
- If the parent issue is not provided, infer it from the current branch/workstream; otherwise ask.
- Do not push the branch until the parent feature is complete unless the user asks.
- Stop if any step requires user confirmation, missing test-plan approval, manual checks, or failing checks.

## Procedure

1. Determine the parent issue (from input or current workstream); ask if unclear.
2. If the feature branch/workflow has not started, run `feature start` for the parent issue.
3. Read the parent issue and collect child issue links.
4. If open child issues remain:
   - Determine the next open child issue (respecting the preferred order).
   - Run the `feature next` procedure for that child issue.
5. If the child issue completes:
   - Commit the work.
   - Update the child issue and parent checklist.
   - Record the child retrospective.
6. Repeat steps 4–5 until no open child issues remain.
7. When all child issues are complete, run `feature finish` to execute the end-to-end closeout.
8. If any step requires a decision, clarification, or high-risk action, stop and ask before proceeding.

## Stop conditions (always stop and ask)

- A decision/unknown blocks implementation.
- A test plan is missing or needs re-approval.
- Required manual checks or usage scenarios remain.
- Required checks or base tests fail.
- The working tree is not clean and the change is not part of the current child issue.
- Any high-risk action is required (history rewrites, force pushes, ruleset changes, destructive deletes).

## Output

- Current stage (start/next/finish) and remaining open issues.
- Any blockers or decisions needed.
- Confirmation that the workflow will continue after your answer (or stop if the feature is complete).
