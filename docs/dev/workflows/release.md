# Release Workflow

Use this workflow to ship a release to GitHub Pages for this app.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-03
- **Type**: How-to
- **Scope**: release and deployment for biruks-egg-deliveries
- **Non-goals**: changing deployment tooling or hosting strategy
- **Applies to**: releases to the `gh-pages` branch

## Trigger

- You are ready to deploy a new version to production.

## Inputs

- Release scope (what changed).
- Whether to run tests before shipping.
- Next version tag (format `vYYYY.M.P`).

## Constraints

- Follow `.github/prompts/release.prompt.md` for canonical commands.
- Do not change deployment tooling without approval.
- Confirm the version tag before releasing.
- Prefer running the release flow via the `/release` prompt.
- Run full regression packs (TP-01 through TP-11) and usage scenarios before tagging or deploying to GitHub Pages.
- Ensure required branch protection checks (for example `unit-tests`, `pr-body-validation`) are passing before release tags.

## Steps

1. Review repo state:
   - Ensure `git status -sb` is clean.
2. Run tests if required:
   - Use `npm test` or the documented test command.
3. Run full regression packs and usage scenarios:
   - Execute TP-01 through TP-11 per `docs/testing/regression-tests.md`.
   - Execute `docs/testing/usage-scenario-tests.md`.
   - Record results (or explicitly document any skipped packs).
4. If any packs are skipped, create a waiver record before deployment:
   - Note which packs were skipped, why, and who approved the skip.
   - Store the waiver in the release notes or a PR comment.
4. Record device checklist status:
   - Note TP-11 device/PWA checks in release notes or a shared test log.
5. Build the production bundle:
   - `npx ng build --configuration production --base-href="/biruks-egg-deliveries/"`
6. Deploy to GitHub Pages:
   - `npx angular-cli-ghpages --dir=dist/egg-delivery-app/browser --branch=gh-pages`
7. Tag the release:
   - Use `vYYYY.M.P` format.

## Checks

- Build completes without errors.
- `gh-pages` branch updated.
- Release tag created and pushed.
- TP-11 device checklist status recorded.
- Full regression packs and usage scenarios completed (or explicitly deferred with approval).
- Waiver recorded when any packs are skipped.

## Outputs

- Updated production deployment.
- New version tag for the release.

## What changed / Why

- Added a TP-11 device checklist note so manual device coverage is tracked per release.
- Required full regression packs and usage scenarios before release tags and GH Pages deploys.
- Added a waiver requirement for any skipped regression packs.
- Noted required branch protection checks before release tags.

## Related docs

- `.github/prompts/release.prompt.md`
- `docs/dev/workflows/quality.md`
