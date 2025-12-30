# Triage Workflow

Use this workflow to log, reproduce, and prioritize issues consistently.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-30
- **Type**: How-to
- **Scope**: issue and PR triage for this repo
- **Non-goals**: long-term product planning
- **Applies to**: GitHub issues and PRs

## Trigger

- New issues/PRs arrive.
- Existing items need prioritization or clarification.

## Inputs

- Issue/PR links or IDs.
- Repro steps and environment details.
- Desired priority or target milestone (if any).

## Constraints

- Follow `.github/prompts/triage.prompt.md` for CLI-based triage.
- Use `.github/prompts/issues.prompt.md` for issue creation standards.
- Prefer `gh issue create --body-file` for multi-line issue bodies.
- Prefer running triage via the `/triage` prompt when possible.

## Steps

1. Triage new items:
   - Confirm reproducibility and scope.
2. Capture clarity:
   - Ensure problem statement, expected vs actual, and repro steps are recorded.
3. Apply metadata:
   - Add labels, priority, and status.
4. Decide next action:
   - Assign to a milestone, create a branch, or request more info.

## Checks

- Issue has clear repro steps or is explicitly marked “needs info.”
- Labels and priority reflect impact and urgency.
- Next action is assigned.

## Outputs

- A triaged issue/PR with consistent metadata.
- Follow-up tasks or clarifying questions.

## What changed / Why

- Added guidance to use `--body-file` for multi-line issue bodies to avoid quoting issues.

## Related docs

- `.github/prompts/triage.prompt.md`
- `.github/prompts/issues.prompt.md`
