# Triage Workflow

Use this workflow to log, reproduce, and prioritize issues consistently.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-05
- **Type**: How-to
- **Scope**: issue creation, refinement, breakdown, and PR/issue triage for this repo
- **Non-goals**: long-term product planning or feature implementation
- **Applies to**: GitHub issues and PRs

## Trigger

- New issues/PRs arrive.
- Existing items need prioritization or clarification.

## Inputs

- Issue/PR links or IDs.
- Repro steps and environment details.
- Desired priority or target milestone (if any).
- Issue title/summary for new work.

## Constraints

- Follow `.github/prompts/triage.prompt.md` for CLI-based triage.
- Use `.github/prompts/issues.prompt.md` to execute issue create/refine/breakdown; this workflow is the canonical procedure.
- Prefer `gh issue create --body-file` for multi-line issue bodies.
- Prefer running triage via the `/triage` prompt when possible.

## Steps

### Issue creation

1. Confirm required sections exist (problem statement, proposed solution, acceptance criteria, testing plan, risks, docs impact, change-impact summary).
2. If templates exist in `.github/ISSUE_TEMPLATE/`, follow them.
3. Apply labels (type/area/priority) and `status:needs-triage` when available.
4. If any required section is missing, immediately run issue refinement before implementation starts.

### Issue refinement

1. Read the issue, linked docs, and any related code to identify unknowns.
2. Ask targeted questions for missing decisions (UX, data rules, edge cases, testing).
3. Update the issue with decisions, acceptance criteria, and a complete test plan.
4. Mark the test plan approved when sufficient for implementation.

### Issue breakdown

1. Review relevant docs and scan the codebase to confirm impacted files and risks.
2. Decide parent + child structure when work spans multiple areas.
3. Create child issues for UI/data/tests/docs/ops as needed.
4. Link child issues in the parent (checklist) and update the parent description.

### Triage

1. Confirm reproducibility and scope.
2. Ensure clarity (problem statement, expected vs actual, repro steps).
3. Apply metadata (labels, priority, status).
4. Decide next action (milestone, branch, request info).
5. If required template sections are missing, run `issues refine` before implementation.

## Checks

- Issue has clear repro steps or is explicitly marked “needs info.”
- Labels and priority reflect impact and urgency.
- Template sections (testing plan, risk assessment, docs impact, change impact) are present or a refine follow-up exists.
- Test plan is approved before implementation.
- Child issues are linked to the parent when breakdown is required.
- Next action is assigned.

## Outputs

- A created/refined/broken-down issue set with consistent metadata.
- A triaged issue/PR with consistent metadata.
- Follow-up tasks or clarifying questions.

## What changed / Why

- Added guidance to use `--body-file` for multi-line issue bodies to avoid quoting issues.
- Added canonical issue create/refine/breakdown steps so prompts can reference workflows.

## Related docs

- `.github/prompts/triage.prompt.md`
- `.github/prompts/issues.prompt.md`
