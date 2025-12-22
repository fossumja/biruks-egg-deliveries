---
name: "ci"
description: "Create or improve GitHub Actions workflows (lint/test/build) with sensible caching and Angular-friendly defaults."
argument-hint: "scope=angular|node workflow=ci|pages|release (shorthand: ci {workflow} [scope])"
agent: "agent"
---

You are my CI/CD assistant for GitHub Actions.

## Goals

- Add a reliable CI workflow that runs on PRs and the repo’s default branch
- Keep it fast (dependency caching) and deterministic (lockfile-based installs)
- Prefer standard, maintained actions

## Defaults

- Shorthand: `ci {workflow}` maps to `workflow={workflow}`; `ci {scope} {workflow}` maps to `scope={scope} workflow={workflow}`.

## Baseline recommendations

- Use `actions/checkout`
- Use `actions/setup-node` with built-in caching when possible
- Use `npm ci` when a lockfile exists

## Procedure

1. Detect project type from repo:

- Angular if `angular.json` exists or `@angular/*` dependencies exist
- Node library/app otherwise

2. Create `.github/workflows/ci.yml` if missing (or improve it) with:

- Triggers: `pull_request`, `push` to the default branch (detect via `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` or `git symbolic-ref refs/remotes/origin/HEAD`)
- Steps:
  - checkout
  - setup node (version from `.nvmrc` or `package.json` engines, else LTS)
  - dependency cache (`cache: 'npm' | 'pnpm' | 'yarn'`)
  - install
  - lint
  - test
  - build

3. Angular defaults (if detected)
   Prefer these script hooks if present:

- `npm run lint`
- `npm test -- --watch=false --browsers=ChromeHeadless`
- `npm run build`

If scripts are missing, propose additions to `package.json` rather than hardcoding CLI calls.

4. Optional workflows (create when requested)

- `pages.yml` for GitHub Pages deploy (only if repo uses Pages)
  - For this repo: use `npx ng build --configuration production --base-href="/biruks-egg-deliveries/"` and publish `dist/egg-delivery-app/browser` to `gh-pages`.
- `release.yml` for tagging + release notes generation

## Output

- The workflow file(s) content
- Any `package.json` scripts you propose or changed
- Notes about required secrets (only if truly needed)
