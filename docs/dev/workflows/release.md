# Release Workflow

Use this workflow to ship a release to GitHub Pages for this app.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
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

## Steps

1. Review repo state:
   - Ensure `git status -sb` is clean.
2. Run tests if required:
   - Use `npm test` or the documented test command.
3. Build the production bundle:
   - `npx ng build --configuration production --base-href="/biruks-egg-deliveries/"`
4. Deploy to GitHub Pages:
   - `npx angular-cli-ghpages --dir=dist/egg-delivery-app/browser --branch=gh-pages`
5. Tag the release:
   - Use `vYYYY.M.P` format.

## Checks

- Build completes without errors.
- `gh-pages` branch updated.
- Release tag created and pushed.

## Outputs

- Updated production deployment.
- New version tag for the release.

## Related docs

- `.github/prompts/release.prompt.md`
- `docs/dev/workflows/quality.md`
