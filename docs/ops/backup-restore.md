# Backup and Restore Operations

Runbook for backing up data and restoring from a backup CSV.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: How-to
- **Scope**: data backup and restore workflows
- **Non-goals**: changing CSV formats or implementing new storage features
- **Applies to**: operational backups via the app UI

## Triggers

- Before importing a new CSV.
- After completing a run.
- When preparing for device changes or handoffs.

## Preconditions

- App is loaded with the correct dataset.
- You have access to the device file picker.

## Procedure

### Backup (CSV)

1. Go to Home.
2. Use **Backup (CSV)** to export.
3. Save the file in a safe location.

### Restore (CSV)

If the app has a **Restore backup (CSV)** action:

1. Confirm you are ready to replace in-app data.
2. Select the backup CSV file.
3. Verify the app reloads routes and history as expected.

If **Restore backup** is not present, restoration is not supported yet. Do not attempt to import a backup CSV as a normal import unless you accept losing in-app history.

## Rollback

- If a restore replaces data unexpectedly, re-run restore using the previous backup file.
- If no backup exists, re-import the original CSV and rebuild as needed.

## Verification

- Planner shows expected routes and stops.
- Run history (if present) matches the backup.
- Totals and one-offs appear consistent.

## Related docs

- `docs/user/user-guide.md`
- `docs/reference/csv-format.md`
