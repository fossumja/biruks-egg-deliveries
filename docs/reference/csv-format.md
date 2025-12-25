# CSV Format Reference

Reference for the CSV files the app imports, exports, and restores. Covers baseline delivery imports and the backup format that includes run history and one-off events.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-23
- **Type**: Reference
- **Scope**: CSV import/export schema and parsing rules
- **Non-goals**: UI steps for importing/exporting CSV files
- **Applies to**: CSV files used by the app

## Summary

The app supports two CSV variants:

- Baseline import files that describe deliveries.
- Backup exports that include run history and one-off events using `RowType`.

Baseline imports read delivery rows only. Backup restores read all row types and rebuild history.

Backup exports include all history rows, while totals columns are scoped to the tax year selected at export time.

## Contract

### Column conventions

- CSVs must include a header row.
- Header matching is case-insensitive for known columns and supports common aliases.
- UTF-8 BOM is accepted on the first header (for example `\ufeffSchedule` from Excel).
- Column order is preserved from the original import headers; exports prepend required columns and append missing history/totals columns.
- Backup exports always add a leading `RowType` column. If the imported header already contains `RowType`, exports will include two `RowType` columns (the first column is authoritative on restore).
- Extra columns are preserved in `importState` and re-exported on `Delivery` rows.

### Baseline delivery columns

These columns are read when importing a route CSV.

| Column | Required | Type | Notes |
| --- | --- | --- | --- |
| `Schedule` or `Date` | Yes | string | Route label/date. Used for `routeDate` and `week` grouping. |
| `BaseRowId` | No (recommended) | string | Stable per-customer id. Missing values fall back to `ROW_{index}`. |
| `Delivery Order` or `Order` | No | number | Accepted, but ordering is normalized to row position within each schedule on import. |
| `Name` | No (recommended) | string | Customer name. |
| `Address` | No (recommended) | string | Street address. |
| `City` | No | string | City. |
| `State` | No | string | State or province. |
| `ZIP` | No | string | Postal code. |
| `Dozens` or `Qty` | No (recommended) | number | Parsed with `Number()`. Non-numeric values fail import. Missing values default to `0`. |
| `Subscribed` | No | boolean | Blank defaults to `true`. `true/yes/1` map to `true`; other non-empty values map to `false`. |
| `Notes` | No | string | Freeform notes. |
| `DonationStatus` | No | enum | `NotRecorded`, `Donated`, `NoDonation`. |
| `DonationMethod` | No | enum | `cash`, `venmo`, `ach`, `paypal`, `other`. |
| `DonationAmount` | No | number | Donation amount for the row (optional). |
| `RowType` | No | string | If present, only `Delivery` rows are imported. |

### RowType values (baseline import)

When `RowType` is present, the import parser only accepts rows where the value is empty or `Delivery` (case-insensitive). Other row types are ignored unless this file is used as a backup restore.

### Backup export and restore format

Backups include baseline columns plus history columns. They always include a `RowType` column.

#### RowType values (backup)

- `Delivery`: baseline rows from the original import.
- `RunEntry`: historical run snapshot rows.
- `OneOffDonation`: donation-only events not tied to a run.
- `OneOffDelivery`: delivery events not tied to a run.

#### History columns (run and one-off rows)

These columns are appended on export and used during restore.

| Column | Type | Notes |
| --- | --- | --- |
| `RunId` | string | Required for `RunEntry` rows. |
| `RouteDate` | string | Route date label for the run. |
| `ScheduleId` | string | Normalized schedule id for the run (route date with whitespace removed). |
| `RunStatus` | string | `completed` or `endedEarly` (case-insensitive; `endedearly` and `ended_early` also map to `endedEarly`). |
| `RunBaseRowId` | string | Base row id for the row; required for history rows. |
| `RunDeliveryOrder` | number | Delivery order within the run. |
| `RunEntryStatus` | string | `delivered` or `skipped` (any non-`skipped` value restores as `delivered`). |
| `RunDozens` | number | Dozens delivered for the event. |
| `RunDonationStatus` | string | `NotRecorded`, `Donated`, `NoDonation`. |
| `RunDonationMethod` | string | `cash`, `venmo`, `ach`, `paypal`, `other`. |
| `RunDonationAmount` | number | Donation amount for the event. |
| `RunTaxableAmount` | number | Deductible contribution for the event (amount above the suggested baseline). |
| `RunCompletedAt` | string | ISO timestamp of run completion. |
| `EventDate` | string | ISO timestamp for the event; date-only inputs are normalized to ISO at local midday to avoid timezone drift. |
| `SuggestedAmount` | number | Baseline amount used at the time of the event. |

#### EventDate parsing and fallbacks

On restore, `EventDate` is normalized with the same rules used on export:

- ISO timestamps are normalized to ISO.
- `YYYY-MM-DD` date-only values are normalized to ISO at local midday.
- Excel serial numbers (for example, `45215` or `45215.5`) are converted using the 1900 date system.

If `EventDate` is missing or invalid, restore falls back to:

- `RunEntry`: `RunCompletedAt`, then `RouteDate` for the run; if both are missing, the restore timestamp is used.
- `OneOffDonation`/`OneOffDelivery`: the delivery `RouteDate` (Schedule/Date) for the matched base row; if missing, the date remains blank.

#### Totals columns

Totals are computed and exported as:

- `TotalDonation`
- `TotalDozens`
- `TotalDeductibleContribution`

Totals reflect the tax year selected on Home at export time and are only populated on `Delivery` rows.

Totals seeded from imported CSVs are only included for the original import year (based on `lastImportAt`); restored backups recompute totals from receipts only.

Exports without an import state use `TotalTaxableDonation` instead of `TotalDeductibleContribution`.

### Legacy export (no import state)

If the app has no saved import state, exports are a flat delivery list with these columns:

- `Date`
- `Delivery Order`
- `Name`
- `Address`
- `City`
- `State`
- `ZIP`
- `Dozens`
- `Notes`
- `Status`
- `DeliveredAt`
- `SkippedAt`
- `SkippedReason`
- `DonationStatus`
- `DonationMethod`
- `DonationAmount`
- `TotalDonation`
- `TotalDozens`
- `TotalTaxableDonation`

`Status` uses the delivery status values defined in `docs/reference/data-model.md`.

### Compatibility and versioning rules

- There is no explicit schema version column; compatibility is handled by optional columns and defaults.
- Unknown `RowType` values are ignored on restore; unknown columns are preserved on `Delivery` rows.
- `RowType` values are case-insensitive on import and restore.
- The restore parser accepts `RunTaxableAmount` or `TaxableAmount` when rebuilding receipts.
- Backup exports preserve the original header order and append missing columns, so column order can vary between files.

## Examples

- `docs/data/BiruksEggDeliveries-2025-12-17.csv`
- `docs/data/BiruksEggDeliveries-2025-12-22.csv`

## Related docs

- `docs/ops/backup-restore.md`
- `docs/reference/data-model.md`
- `docs/reference/glossary.md`
