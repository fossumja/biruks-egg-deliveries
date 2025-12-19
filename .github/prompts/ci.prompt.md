---
mode: "agent"
description: "Set up CI workflows (GitHub Actions) for Angular PWA project"
---

# Continuous Integration Workflow Setup

You are an expert DevOps agent configuring CI for an Angular web application (with PWA support).

**Context:**

- The project is an Angular app using Angular CLI. It may include a service worker for PWA.
- The repository likely contains an `angular.json` and a `package.json` with scripts for build, test, etc.
- Assume Node.js is required (use LTS version by default, e.g. Node 18).

**Goal:** Automate a robust CI pipeline using GitHub Actions with minimal user input and smart defaults.

**Tasks:**

- Create a CI workflow file (e.g., `.github/workflows/ci.yml`) triggered on pull requests and pushes to main (and development) branches.
- In the workflow, set up jobs for:
  - **Install & Build:** Check out code, use `actions/setup-node@v3` (specify Node LTS), install dependencies (npm or pnpm) with caching, then run the Angular build (e.g., `npm run build` or `ng build --configuration=production`) to ensure the app compiles successfully.
  - **Linting:** Run ESLint (and stylelint if a stylelint config or SCSS/CSS files exist) to enforce code style. Use the existing npm script (e.g., `npm run lint`) or configure an ESLint step. Ensure the workflow fails on any lint errors.
  - **Testing:** Run unit tests in headless mode. If Jest or Vitest is configured (check for `jest.config.js` or `vitest.config.ts`), use the appropriate command (e.g., `npm run test:ci` or `npm run test` with `-- --watch=false`). If the project uses Angular’s default Karma, use ChromeHeadless or a headless browser to run `ng test` without interactions.
  - **Optional Deploy:** If the project uses GitHub Pages or another deployment target, include a job (triggered on push to `main` or on version tags) to deploy the app. For GitHub Pages, build the app and use an action (e.g., `peaceiris/actions-gh-pages` or `angular-cli-ghpages`) to publish the `dist/` output to the `gh-pages` branch. For custom hosts (Netlify, Firebase, etc.), leave a placeholder or comment indicating where to add deployment steps (using deploy CLI or API calls with secrets).
- Use **caching** to speed up CI: enable dependency caching with `actions/setup-node` (e.g., `with: node-version: 18, cache: 'npm'` and `cache-dependency-path: package-lock.json` or `pnpm-lock.yaml`). This caches `node_modules` between runs. Additionally, cache Angular build output (`.angular/cache`) if the project is using Angular’s build cache.
- Implement **concurrency control** for the workflow to avoid duplicate runs on the same branch. For example, add:

  ```yaml
  concurrency:
    group: ci-${{ github.ref_name }}
    cancel-in-progress: true
  ```
  This cancels any previous in-progress run of the CI on the same branch.
- Apply security best practices in the workflow:
  - Specify minimal permissions for the GITHUB_TOKEN, for example:
    ```yaml
    permissions:
      contents: read
    ```
    (Add others only if required, such as `pages: write` for a Pages deploy job.)
  - Use non-privileged runners or lock down self-hosted runners if applicable.
  - Ensure secrets (deploy keys, API tokens) are stored in GitHub Actions secrets and referenced via `${{ secrets.MY_TOKEN }}`.
- After setting up the workflow, use GitHub CLI to commit the changes. For example, stage the new workflow file and run `gh pr create -t "CI: Set up Angular CI pipeline" -b "Add GitHub Actions workflow for build, lint, test (and deploy)"` to open a pull request for the CI workflow (or push directly to a branch if appropriate).
- Branch Protection (reminder): Ensure branch protection rules require the CI checks (build, test, lint, etc.) to pass before merges. The agent cannot enforce this in code, but should remind the user to enable required status checks in repository settings.
  ```

No user prompts: Do not ask the user for configuration values already inferable from the project. Use sensible defaults (e.g., use npm ci if a package-lock.json is present, detect the package manager from lockfiles, choose ChromeHeadless for Angular tests by default, etc.). Proceed with implementation directly unless absolutely necessary.
