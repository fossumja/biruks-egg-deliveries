# ADR-2025-12-19 - Multi-run history snapshots

Introduces persisted run snapshots and a run history selector so completed routes can be archived and browsed. Keeps totals and exports consistent across baseline, completed runs, and one-off activity.

- **Status**: Stable
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Explanation
- **Scope**: run history snapshots and planner history behavior
- **Non-goals**: UI polish outside run history or alternative storage backends
- **Applies to**: `src/app/**`

## Context

- The app currently keeps only the live route state in IndexedDB; past runs exist only in exported CSVs.
- Users need an explicit way to finish a run, reset the live route, and browse past runs for a schedule.
- Totals and exports need to accumulate across baseline imports, completed runs, and one-off activity.

## Decision

- Store completed runs as snapshots in IndexedDB with run metadata and per-stop entries.
- Add a Complete run action that snapshots the current run (including ended-early status) and resets the live route for the next run.
- Add a run selector in the Planner to switch between the current live route (editable) and archived runs (read-only).
- Compute totals and CSV exports from baseline import totals plus all completed run entries and live deliveries/one-offs.
- Preserve run history across CSV imports; imports only replace live deliveries and routes.

## Alternatives considered

- Keep history only in CSV exports and external spreadsheets.
- Duplicate deliveries per run in the main deliveries table.
- Maintain an append-only action log and reconstruct runs from it.

## Consequences

- Requires a Dexie schema update and migration to add runs/runEntries tables.
- UI must prevent editing archived runs and make run completion an explicit step.
- Storage grows with each run, but the data volume remains small for expected usage.
- Export totals become lifetime totals, and users must complete runs to archive history.

## Follow-ups

- Implement StorageService completeRun and run history query helpers.
- Add Planner run selector UI and archived run rendering.
- Update run completion UX flow and add optional run history export.
- Add tests for snapshots, totals, and archived-run read-only behavior.
