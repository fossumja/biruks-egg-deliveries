# ADR-2025-12-19 - Backup/restore round-trip CSV

Defines a RowType-based CSV format that round-trips deliveries, run history, and one-off events in a single file. Restore is explicit and rebuilds application state from the backup.

- **Status**: Stable
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Explanation
- **Scope**: CSV backup/restore format and restore flow
- **Non-goals**: non-CSV backup formats or migration tooling
- **Applies to**: `src/app/**`

## Context

- We need a single CSV that can export current deliveries plus run history and later restore the full state.
- Normal CSV import should not duplicate or overwrite run history stored in IndexedDB.
- One-off donations and deliveries should round-trip with enough detail to recompute totals.

## Decision

- Add a RowType column to CSV exports with these row types:
  - Delivery
  - RunEntry
  - OneOffDonation
  - OneOffDelivery
- Export all row types in one CSV for full round-trip backups.
- Import (new baseline data) processes only Delivery rows and ignores other row types.
- Restore is an explicit flow that clears deliveries, routes, runs, run entries, and import state, then rebuilds them from the CSV.
- RunId from the CSV is authoritative to keep run history stable across restores.

## Alternatives considered

- Use separate files for run history and deliveries.
- Store backup data as JSON instead of CSV.
- Treat any CSV import as a restore and always clear history.
- Keep run history only in Dexie and never export it.

## Consequences

- CSV schema changes and row-type filtering logic are required.
- UI needs a restore control with a strong confirmation flow.
- Restore becomes idempotent by clearing and rebuilding state.
- Backward compatibility requires treating missing RowType as Delivery.

## Follow-ups

- Implement clearAllData and restore orchestration.
- Finalize RunEntry column ordering and update export helpers.
- Add tests for import filtering, restore correctness, and history round-trip.
