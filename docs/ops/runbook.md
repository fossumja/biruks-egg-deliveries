# Operational Runbook

Operational checks and troubleshooting steps for day-to-day app usage.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-31
- **Type**: How-to
- **Scope**: operational health checks and common issues
- **Non-goals**: deep debugging or code-level fixes
- **Applies to**: installed PWA usage

## Triggers

- The app appears out of date or data looks incorrect.
- A run cannot be completed or data appears missing.

## Preconditions

- The device has access to the PWA and local storage.

## Procedure

### Health check

1. Open the Home page.
2. Confirm **Imported**/**Restored** timestamps are reasonable.
3. Confirm the correct **Tax year** is selected.
4. Run **Backup CSV** before making changes.

### Data mismatch

1. Confirm the correct route is selected in Planner (under **Routes**).
2. If you need to edit live stops, make sure you are not viewing **Past runs** or **All receipts**.
3. If a recent import or restore was done, remember it replaces live data.
4. If totals look wrong, confirm the selected tax year and re-export a backup.

### App out of date

1. Check build info on Home.
   - Build info is generated during the build/deploy step from `public/build-info.json`.
   - The footer shows the **installed build** (what is currently running on the device).
2. If an **Update available** prompt appears, tap **Reload** to refresh to the latest build.
3. If no prompt appears after a new deploy, fully close and reopen the PWA to force an update check.
4. Reload the PWA or reinstall if the build info remains stale.

## Rollback

- Restore from the most recent backup if a change causes data loss.

## Verification

- Planner shows the expected routes/stops.
- Run page flows work for at least one stop.

## What changed / Why

- Updated the health and mismatch checks to match the current Planner and tax-year UI.

## Escalation

- If issues persist, capture steps to reproduce and file an issue via `.github/prompts/issues.prompt.md`.

## Related docs

- `docs/ops/backup-restore.md`
- `docs/user/user-guide.md`
