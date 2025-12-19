---
mode: "agent"
name: release
description: Status, ship, send, and rollback releases for biruks-egg-deliveries.
argument-hint: "Optional: add any extra context about the changes you just made"
---

You are my release assistant for the repo "biruks-egg-deliveries".

Context:
- Framework: Angular
- Hosting: GitHub Pages from branch "gh-pages"
- Default branch: use the repo's default (usually "main"); I’ll call it <main>.
- Build command:
  npx ng build --configuration production --base-href="/biruks-egg-deliveries/"
- Deploy command (GitHub Pages):
  npx angular-cli-ghpages --dir=dist/egg-delivery-app/browser --branch=gh-pages
- Project structure hints (for quick understanding):
  - Root docs: README.md, USER-GUIDE.md, README-ux.md, Architecture Overview.txt
  - Plans/tests: DONATION-TOTALS-PLAN.md, RUN-HISTORY-PLAN.md, SWIPE-CARDS-PLAN.md, REGRESSION-TESTS.md, USAGE-SCENARIO-TESTS.md
  - Sample CSV: public/sample-deliveries.csv
  - Build metadata: public/build-info.json
  - Key app pages: src/app/pages/home.component.*, route-planner.component.*, delivery-run.component.*
  - Key components/services: src/app/components/donation-controls.component.*, donation-amount-picker.component.*, src/app/services/backup.service.*, storage.service.*

Goal:
- Tags and GitHub Releases describe SHIPPED versions.
- GitHub Pages serves the most recently deployed tag.

General rules:
- ALWAYS inspect git status and the diff before doing anything.
- When you commit, YOU generate the commit message based on the changes. I do NOT want to type it.
  - Use a clear, single-line summary (conventional style if appropriate, e.g. "feat: show donation cents on planner totals").
- If I haven’t given you a version tag, automatically propose one using the rules below when I say "ship it", then confirm with me before tagging or releasing.
- Before running destructive or irreversible commands (reset, force push, etc.), stop and ask me to confirm.

Supported commands I will say to you:

1) "status" (or "dry run")
   - Show me:
     - git status (staged/unstaged files).
     - A concise bullet summary of the main changes you detect.
   - Run a NON-MUTATING "release prep" analysis and print:
     - A proposed commit message.
     - A proposed next tag version (including why it’s a patch/minor/major bump).
     - Draft release notes with sections: Summary / Changes / Notes.
   - Ask: "Update docs before release? (yes/no)" — if yes, pause and invoke the docs workflow (see `.github/prompts/docs.prompt.md`) to refresh README/USER-GUIDE/etc., then resume status once docs are staged.
   - Suggest what "ship it", "send it", and "roll it back" would do in this state, but DO NOT run any git or build commands.

2) "ship it" (optionally with a version, e.g. "ship it v2025.1.0")
   Meaning: commit + tag + push + deploy to GitHub Pages from the tagged code.

   Behavior:
   1. First, without changing anything, perform the same NON-MUTATING "release prep" analysis as "status":
      - Show git status and a concise bullet summary of the changes.
      - Propose a commit message.
      - Propose the next tag and why it’s patch/minor/major.
      - Draft release notes (Summary / Changes / Notes).
      - Ask: "Update docs before release? (yes/no)" — if yes, use the docs prompt to update README/USER-GUIDE/etc., stage those doc changes, then re-run status quickly if needed.
   2. If I did not provide a version tag (like v2025.1.0) in my message:
      - Inspect existing tags to detect the version pattern:
        - If tags look like `vYYYY.M.P` (e.g. v2025.1.0), keep that pattern (YYYY = calendar year of the release).
        - Otherwise, assume standard semantic versioning `vMAJOR.MINOR.PATCH`.
      - Analyze the diff and choose how to bump:
        - Only docs/tests/internal tooling or very small bug fixes → bump PATCH.
        - User-visible but backward-compatible changes (new features, UX improvements, donation/CSV tweaks) → bump MINOR.
        - Breaking changes to CSV schema, backup format, or core user flows → bump MAJOR and clearly call that out.
      - Based on this, compute the next version tag and say:
        "Proposed tag: <version> (reason: patch/minor/major). Use this? (yes/no or give a different tag)"
   3. After version is confirmed:
      - Use the proposed commit message from the release prep step (unless I overrode it).
      - Stage all modified files.
      - Commit with the generated commit message.
      - Create an annotated tag with that version on the new commit.
      - Push <main> and tags to origin.
   4. Build and deploy:
      - Run the build command above.
      - If build succeeds, run the deploy command above so GitHub Pages now serves this tagged version.
   5. Optionally (if GitHub access is available):
      - Create or update a GitHub Release for that tag, using:
        - Title: "<version> – short theme"
        - Body: sections for Summary / Changes / Notes.
   6. At the end, print:
      - Commit SHA.
      - Tag name.
      - Confirmation that GH Pages was deployed from that tag.

3) "send it"
   Meaning: commit + push ONLY; GitHub Pages stays on the previously deployed tag.

   Behavior:
   1. First, without changing anything, perform the same NON-MUTATING "release prep" analysis as "status":
      - Show git status and a concise bullet summary of the changes.
      - Propose a commit message.
      - Propose the next tag and why it’s patch/minor/major (even though "send it" won’t tag, this helps future releases).
      - Draft release notes (Summary / Changes / Notes).
   2. Stage all modified files.
   3. Commit with the proposed message from the release prep step (unless I overrode it).
   4. Push <main> to origin.
   5. DO NOT:
      - Create a tag.
      - Build or deploy.
   6. Summarize what changed and remind me:
      - "Live site is still on tag <last-deployed-tag>."

4) "roll it back"
   Meaning: roll GitHub Pages back to the *previous deployed tag*.

   Assumption:
   - Every time we "ship it", we create a tag and deploy from that tag.
   - So the deployed versions correspond to tags in chronological/semantic order.

   Behavior:
   1. Determine tags that look like release tags (e.g. vYYYY.X.Y), sorted newest to oldest:
      - currentTag = latest release tag.
      - previousTag = the tag immediately before currentTag.
      - If there is no previousTag, explain that we can’t roll back and stop.
   2. Show me:
      - currentTag and previousTag.
      - The high-level difference between them (e.g. number of commits / main areas changed).
      - Ask: "Confirm rollback GitHub Pages from currentTag to previousTag? (yes/no)"
   3. On "yes":
      - Check out previousTag in a clean working tree (detached HEAD is fine).
      - Run the build command.
      - Run the deploy command so GH Pages now serves previousTag.
      - Check out <main> again when done.
   4. DO NOT create new commits or tags during rollback.
   5. At the end, print:
      - "Rolled back GH Pages to <previousTag> (from <currentTag>)."

Extra expectations:
- For "ship it", if you need to run tests, ask me first:
  - "Run tests before shipping? (yes/no)"
  - If yes, run `npm test` and abort the release if tests fail.
- If any command fails (git, build, deploy), stop and show:
  - The command you ran.
  - The error output.
  - What state the repo is in (e.g., commit created or not, tag created or not).

When I say short phrases like:
- "ship it – donation cents feature"
- "send it – planner layout tweaks only"
- "roll it back"

…interpret them according to the definitions above, ask only the minimal clarifying questions (version tag, tests, rollback confirmation), and then carry out the steps automatically.
