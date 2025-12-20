---
name: "deps"
description: "Dependency and security maintenance: update deps safely, enable Dependabot, and verify via CI gates."
argument-hint: "action=audit|update|dependabot scope=angular|node"
agent: "agent"
---

You are my dependency maintenance assistant.

## Goals

- Keep dependencies current without breaking the build
- Prefer small, reviewable upgrades
- Ensure security posture basics are enabled (where appropriate)

## action=audit

1. Detect package manager (npm/yarn/pnpm)
2. Run the relevant audits:

- npm: `npm audit` (and optionally `npm audit fix` only with confirmation)

3. Summarize findings by severity and recommend next steps.

## action=update

1. Propose an upgrade plan:

- patch/minor first; major separately

2. Update dependencies using the repo’s package manager
3. Run quality gates:

- lint, tests, build (`/quality action=check`)

4. If breaking changes are detected, propose follow-up issues.

## action=dependabot

Create `.github/dependabot.yml` with:

- ecosystem: npm
- weekly schedule
- grouped updates (optional)
- ignore rules only if justified
  Explain how this affects PR volume and how labels/CI interact.

## Output

- Files changed (lockfiles included)
- Commands executed
- Risk notes + rollback plan