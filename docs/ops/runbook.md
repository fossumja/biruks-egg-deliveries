# Operational Runbook

Operational checks and troubleshooting steps for day-to-day app usage.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
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
2. Confirm **Imported** timestamp is reasonable.
3. Run **Backup (CSV)** before making changes.

### Data mismatch

1. Confirm the correct schedule is selected in the Planner.
2. Check that the run selector is on **Current (live)** if editing is expected.
3. If a recent import was done, remember it replaces live data.

### App out of date

1. Check build info on Home.
2. Reload the PWA or reinstall if the build info is stale.

## Rollback

- Restore from the most recent backup if a change causes data loss.

## Verification

- Planner shows the expected routes/stops.
- Run page flows work for at least one stop.

## Escalation

- If issues persist, capture steps to reproduce and file an issue via `.github/prompts/issues.prompt.md`.

## Related docs

- `docs/ops/backup-restore.md`
- `docs/user/user-guide.md`
