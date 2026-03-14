# CLAUDE.md – Biruk's Egg Deliveries

Claude Code configuration for this repository. Claude reads this file automatically at the start of every session.

> **Multi-agent coexistence:** `AGENTS.md` (Codex/Antigravity) and this file (Claude) are parallel entry points to the same canonical source of truth in `.github/prompts/` and `docs/dev/`. Do not duplicate logic here — reference those files instead.

---

## Project at a glance

Offline-first Angular PWA for planning and recording egg deliveries. Designed for iPhone home-screen use with no backend. Data lives in IndexedDB (Dexie) with CSV import/export as backup.

- **Tech stack:** Angular 19 · TypeScript · Dexie · PapaParse · Karma/Jasmine
- **Deploy:** GitHub Pages (PWA/service worker)
- **State:** Signals (`signal()`, `computed()`, `effect()`) — no NgRx
- **Build:** `npm run build` (runs `scripts/write-build-info.js` via `prebuild`)
- **Test:** `npm test` (watch) · `npm run test:ci` (ChromeHeadless, coverage)

---

## Sources of truth (always prefer these over memory)

| What | Where |
|---|---|
| Project vision & constraints | `.planning/project.md` |
| Active phase & current state | `.planning/state.md` |
| Roadmap | `.planning/roadmap.md` |
| Coding standards | `.github/instructions/project-standards.instructions.md` |
| Workflow prompts | `.github/prompts/*.prompt.md` |
| Dev workflows | `docs/dev/workflows/` |
| Best practices | `docs/dev/best-practices/` |
| Repo index | `index.md` |

Read `.planning/state.md` and `.planning/project.md` at the start of any feature or significant task.

---

## Coding standards

Follow `.github/instructions/project-standards.instructions.md` for all TypeScript, Angular, and accessibility work. Key rules (non-exhaustive):

- Standalone components only; do **not** set `standalone: true` (default in Angular v19+)
- Signals for all state; `computed()` for derived state; never `mutate()` — use `update()` or `set()`
- `ChangeDetectionStrategy.OnPush` on every component
- `input()` / `output()` functions, not decorators
- No `ngClass` / `ngStyle` — use `class` / `style` bindings
- Strict TypeScript; no `any` — use `unknown`
- WCAG AA accessibility; all UI changes pass AXE checks

---

## Workflow conventions

Canonical workflows live in `.github/prompts/`. When asked to perform any named workflow, read and follow the corresponding prompt file.

| Workflow | Prompt file |
|---|---|
| feature (start/next/status/finish/review/all) | `.github/prompts/feature.prompt.md` |
| issue triage / create | `.github/prompts/issues.prompt.md` |
| branch create/sync/delete | `.github/prompts/branch.prompt.md` |
| PR create/review/merge | `.github/prompts/pr.prompt.md` |
| commit message | `.github/prompts/commit.prompt.md` |
| testing / TP-xx packs | `.github/prompts/testing.prompt.md` |
| quality checks | `.github/prompts/quality.prompt.md` |
| docs updates | `.github/prompts/docs.prompt.md` |
| release | `.github/prompts/release.prompt.md` |

Branch naming: `feat/<slug>` · `fix/<slug>` · `chore/<slug>` · `docs/<slug>` · `ci/<slug>`
Commit style: Conventional Commits (`feat(scope): ...`, `fix(scope): ...`)
Repo ID shorthand: **BED**

---

## V-model gates (feature work)

Do not skip these gates before coding:

1. **Design/ADR review** recorded before implementation starts.
2. **Test plan approved** (automated specs + TP-xx manual checks) in the issue.
3. **Traceability** from requirements to verification evidence in the PR.
4. **Docs impact** resolved or tracked as a child issue.
5. **`public/release-notes.json`** updated for any user-visible change before opening PR.
6. **Build info refreshed** (`npm run build` or `node scripts/write-build-info.js`) before commit on finish.

---

## Safety rules

- **High-risk actions** (history rewrite, force push, destructive delete, ruleset change, data purge): warn the user, state the impact and rollback option, and get explicit confirmation before proceeding.
- **Worktree safety:** if the working tree is not clean when starting new work, stop and ask how to proceed (commit, stash, discard, or continue current work).
- **Multi-repo guard** before any mutating push/PR/merge: verify repo name, `cwd`, `git remote -v`, and current branch match the intended repo.
- **Scope discipline:** do not implement work outside the active phase; update `.planning/roadmap.md` or the phase plan first if scope changes.

---

## Command preferences

- One command per tool call — no chained `zsh -lc` multi-commands or loops.
- Use `--body-file` for multi-line `gh issue`/`gh pr` bodies instead of heredoc pipes.
- Use `tmp/` (repo-local) for temp files, not `/tmp`.
- Prefer `gh issue develop <issue>` to create linked branches.
- Detailed guidance: `docs/dev/best-practices/agent-terminal-practices.md`

---

## Claude-specific notes

- **Memory:** Claude maintains a persistent memory directory at `~/.claude/projects/.../memory/`. Project context is stored there across sessions. Check it at session start; update it when significant decisions are made.
- **Slash commands:** Claude does not use `.agent/workflows/` wrappers. Invoke workflows by referencing the `.github/prompts/` files directly.
- **No NgModules, no NgRx, no backend** — suggest nothing that violates these constraints.
