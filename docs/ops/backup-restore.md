# Backup and Restore Operations

Runbook for backing up data and restoring from a backup CSV.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-02
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
2. Confirm the correct **Tax year** is selected (totals and filename follow it).
3. Tap **Backup CSV** and save the file (share sheet or download fallback).
4. Confirm the filename includes the selected tax year when applicable.

### Restore (CSV)

1. Tap **Restore CSV** and accept the prompt to back up first.
2. After the backup finishes, tap **Restore CSV** again to choose the file.
3. Confirm the destructive warning to replace current data.
4. Verify the app reloads routes and history as expected.

Do not use **Import CSV** for backup files unless you accept losing run history and one-offs.

## Rollback

- If a restore replaces data unexpectedly, re-run restore using the previous backup file.
- If no backup exists, re-import the original CSV and rebuild as needed.

## Verification

- Planner shows expected routes and stops.
- Run history (if present) matches the backup.
- Totals and one-offs appear consistent, including one-off receipt dates.
- Backup uses share sheet or download fallback on the device.
- Restore prompt appears and the file picker opens after the second tap.

## What changed / Why

- Updated the restore flow to match the current two-step backup-first behavior.
- Added backup filename and tax-year verification notes.
- Added device/PWA verification checks for backup and restore flows.
- Added a verification note to confirm one-off receipt dates after restore.

## Related docs

- `docs/user/user-guide.md`
- `docs/reference/csv-format.md`
