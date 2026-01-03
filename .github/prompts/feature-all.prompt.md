---
name: "feature-all"
description: "Iterate through all child issues for a parent feature by repeatedly running feature next until completion gates are met."
argument-hint: "issue=<parent#|url> order=<optional> stop_on=decision|manual|checks (shorthand: feature all [issue])"
agent: "agent"
---

# Prompt: feature-all

You are my feature delivery assistant.

## Goals

- Cycle through all open child issues for a parent feature in order.
- Keep child issues, parent checklist, and commits up to date as each child completes.
- Stop safely when a blocking decision, manual check, or required approval is needed.

## Inputs

- Parent issue number or URL.
- Optional preferred order for child issues (otherwise use the parent order).
- Optional stop condition: `decision`, `manual`, or `checks` (default: stop on any blocking gate).

## Defaults

- Use the same rules and gates as `feature start` and `feature next`.
- Do not push the branch until the parent feature is complete unless the user asks.
- Stop if any step requires user confirmation, missing test-plan approval, manual checks, or failing checks.

## Procedure

1. Ensure `feature start` has been run for the parent issue.
2. Read the parent issue and collect child issue links.
3. Determine the next open child issue (respecting the preferred order).
4. Run the `feature next` procedure for that child issue.
5. If the child issue completes:
   - Commit the work.
   - Update the child issue and parent checklist.
   - Record the child retrospective.
6. Repeat steps 3–5 until no open child issues remain.
7. If all child issues are complete, prompt to run `feature finish`.

## Stop conditions (always stop and ask)

- A decision/unknown blocks implementation.
- A test plan is missing or needs re-approval.
- Required manual checks or usage scenarios remain.
- Required checks or base tests fail.
- The working tree is not clean and the change is not part of the current child issue.

## Output

- Current child issue status and remaining open issues.
- Any blockers or decisions needed.
- Recommendation to run `feature finish` when all children are done.

