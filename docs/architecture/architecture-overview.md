# Architecture Overview

This document describes the current architecture of the Biruk's Egg Deliveries PWA, with an emphasis on offline-first storage, CSV-driven workflows, and run history snapshots.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-23
- **Type**: Reference
- **Scope**: system architecture, storage design, and key data flows
- **Non-goals**: UI walkthroughs or operational procedures
- **Applies to**: `src/app/**`

## System context

- The app is a single-user, offline-first Angular PWA intended for iPhone use.
- The primary workflow is CSV import, route planning, delivery tracking, then backup or restore.
- There is no backend sync in the current codebase. All data lives locally and is exported as CSV when needed.

## High-level architecture

- **Frontend**: Standalone Angular app with three main pages:
  - Home (`src/app/pages/home.component.*`) with the tax-year selector for totals and exports.
  - Route planner (`src/app/pages/route-planner.component.*`)
  - Delivery run (`src/app/pages/delivery-run.component.*`)
- **Routing**: Defined in `src/app/app.routes.ts` with routes for home, planner, and run views.
- **Core services**:
  - `StorageService` (Dexie + IndexedDB) for local persistence.
  - `BackupService` (CSV export and restore data shaping).
  - `ToastService` for transient UI feedback.
  - `BuildInfoService` for reading `public/build-info.json`.
- **PWA**: Service worker configured via `ngsw-config.json` and registered in `src/app/app.config.ts`.

## Storage and data model

- **Local database**: `BiruksEggDeliveriesDB` using Dexie (IndexedDB).
- **Object stores** (as of the current schema):
  - `deliveries`: live route data and per-stop status.
  - `routes`: summary stats per route date.
  - `runs`: run-level snapshots for completed or ended-early runs.
  - `runEntries`: per-stop snapshots for run history.
  - `baseStops`: baseline customer identity data from import.
  - `importStates`: preserved CSV headers and row baselines for round-trip export.
- **Persistence**: The app requests storage persistence via `navigator.storage.persist()` on startup.
- **Model definitions**: See `docs/reference/data-model.md` for canonical fields and types.

## CSV import, backup, and restore

- **CSV parsing**: Imports use PapaParse in `home.component.ts`.
- **Baseline imports**: Read delivery rows into the local database.
- **Sample data**: On a fresh install with no routes, the app loads `public/sample-deliveries.csv` to seed demo data.
- **Backups**: `BackupService` exports CSV using Web Share when available, or a local file download. Totals are scoped to the selected tax year and the filename includes a tax-year suffix.
- **Restore**: Backup CSV restores replace deliveries, routes, run history, and import state in one operation.
- **Formats**: See `docs/reference/csv-format.md` for column rules and `RowType` handling.

## Run history and donation totals

- Completed runs are snapshotted into `runs` and `runEntries` via `StorageService.completeRun`.
- Donation totals are computed from per-event receipts using the global formula and stored on export, with optional tax-year filtering.
- See decisions and reference docs for the rationale and formula details.

## Offline behavior

- The service worker caches the app shell, so the UI loads offline after installation.
- All route actions write to IndexedDB immediately to avoid data loss.
- Backups are local CSV files, so they work without network access.

## External integrations

- **File picker**: CSV import uses the native file picker.
- **Web Share API**: Backup exports use file sharing when supported.
- **Maps**: The planner and run screens build a Google Maps search URL for navigation.

## Constraints and tradeoffs

- **Local-first**: The app favors local data safety over multi-device sync.
- **Single-user focus**: There is no authentication or role system.
- **Restore is destructive**: Backup restore replaces all in-app data.
- **Browser storage limits**: IndexedDB is subject to browser storage policies, so backups remain the safety net.

## Related docs

- `docs/reference/data-model.md`
- `docs/reference/csv-format.md`
- `docs/ops/backup-restore.md`
- `docs/ux/ux-overview.md`
- `docs/decisions/adr-2025-12-19-run-history-snapshots.md`
- `docs/decisions/adr-2025-12-19-donation-totals-global-formula.md`
- `docs/decisions/adr-2025-12-19-backup-restore-roundtrip.md`
