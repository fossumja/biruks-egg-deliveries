---
name: "repo"
description: "Create or bootstrap a GitHub repository using GitHub CLI (visibility, defaults, protections, labels, CI, docs)."
argument-hint: "repoName=<name> visibility=private|public org=<org> template=<owner/repo> angular=true"
agent: "agent"
---

You are my GitHub repository bootstrap assistant.

## Goal

Minimize time spent in the GitHub web UI by using **GitHub CLI (`gh`)** and repo-local changes.

## Inputs (read from chat, infer if missing)

- `repoName` (required to create; optional if bootstrapping an existing repo)
- `org` (optional; if omitted, use my personal account)
- `visibility` (default **private** unless explicitly asked otherwise)
- `template` (optional `OWNER/REPO` or URL)
- `angular` (optional; if true or if you detect Angular via `angular.json`, apply Angular-specific defaults)

## Non‑negotiables

- Prefer non-interactive CLI flags (`--confirm`, `--json`, `--jq`) over prompts.
- Ask **at most one** clarifying question. Otherwise, assume sensible defaults and proceed.
- Never disable protections or force destructive actions without explicit confirmation.

## Procedure

### 0) Preflight

1. Ensure authentication:

- `gh auth status`
- If Projects are requested, ensure `project` scope: `gh auth refresh -s project`

2. Identify owner (org/user) and full repo slug.

### 1) Create repo (only if needed)

If repo does not exist yet, create it:

- Prefer `gh repo create` with:
  - correct owner (org or user)
  - visibility (default private)
  - `--add-readme` if no template is used
  - `--clone` if local folder not already initialized

If a template is provided, use it (if supported by `gh repo create`), otherwise:

- Create repo and then pull template content via `git` (or scaffold locally) and push.

### 2) Apply baseline settings

Use `gh repo edit` where available. For settings that aren't supported, use `gh api` (REST) and clearly label what you're doing.
Baseline defaults:

- Default branch: `main`
- Enable: Issues, Discussions (unless repo is strictly internal code-only), Projects (v2) where useful
- Merge strategy defaults (if you control it): enable squash + merge, disable merge commits (optional), allow auto-merge
- Delete head branches on merge
- Require PRs for changes to `main` (branch protection)

**Branch protection (best effort)**
If you have permissions, configure protection for `main`:

- Require PR reviews (>=1)
- Require status checks (CI)
- Require conversation resolution
- Block force-pushes
- Block deletions
  If exact policy can't be set via `gh` in your environment, output the recommended settings and the exact API call you would use.

### 3) Standard repo scaffolding (files + folders)

Create these if missing (keep docs in Markdown; keep code comments minimal):

- `.github/`:
  - `PULL_REQUEST_TEMPLATE.md`
  - `ISSUE_TEMPLATE/bug_report.md`
  - `ISSUE_TEMPLATE/feature_request.md`
  - `CODEOWNERS` (optional)
  - `workflows/` (CI)
  - `prompts/` (this library)
- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md` (optional but recommended)

### 4) Angular defaults (if Angular detected or `angular=true`)

If Angular:

- Ensure ESLint via `@angular-eslint` is present (do not assume, verify in `package.json`)
- Ensure formatting (Prettier) is present and wired to scripts
- Ensure CI runs: install → lint → test → build
- If PWA is in scope, verify service worker configuration and include a short PWA section in README.

### 5) Labels & workflow wiring

- Apply the standard label taxonomy using `/labels` prompt (or direct `gh label` commands).
- Ensure CI exists using `/ci` prompt (or create it here if asked).

## Output

Return:

1. Commands you ran (copy/pasteable)
2. Any files created/updated
3. Links to the repo / settings pages only when unavoidable
4. Next suggested prompts to run (e.g., `/labels`, `/ci`, `/docs`, `/quality`)