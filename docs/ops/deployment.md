# Deployment

Runbook for deploying the app to GitHub Pages.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: How-to
- **Scope**: production deployment to `gh-pages`
- **Non-goals**: changing hosting providers or build tooling
- **Applies to**: release/deploy operations

## Triggers

- Shipping a new release to production.

## Preconditions

- Working tree is clean.
- You have access to push to `gh-pages`.
- Dependencies are installed.

## Procedure

1. Use the release prompt:
   - Prefer `/release` (see `.github/prompts/release.prompt.md`).
2. Run the production build:
   - `npx ng build --configuration production --base-href="/biruks-egg-deliveries/"`
3. Deploy to GitHub Pages:
   - `npx angular-cli-ghpages --dir=dist/egg-delivery-app/browser --branch=gh-pages`
4. Tag the release:
   - Use `vYYYY.M.P` as documented in the release prompt.

## Rollback

- Re-deploy the previous build output if available.
- Otherwise, re-run the deploy command from the prior known-good commit.

## Verification

- Open the deployed app URL and confirm it loads.
- Verify critical flows: import, planner, run view.

## Escalation

- If deployment fails consistently, review the release prompt and CI logs, then escalate to maintainers.

## Related docs

- `.github/prompts/release.prompt.md`
- `README.md`
- `docs/dev/workflows/release.md`
