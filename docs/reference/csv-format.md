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

## Column conventions

- CSVs must include a header row.
- Header matching is case-insensitive for known columns and supports common aliases.
- UTF-8 BOM is accepted on the first header (for example `\ufeffSchedule` from Excel).
- Extra columns are preserved in `importState` and re-exported on `Delivery` rows.

## Baseline delivery columns

These columns are read when importing a route CSV.

| Column | Required | Type | Notes |
| --- | --- | --- | --- |
| `Schedule` or `Date` | Yes | string | Route label/date. Used for `routeDate` and `week` grouping. |
| `BaseRowId` | No (recommended) | string | Stable per-customer id. Missing values fall back to `ROW_{index}`. |
| `Delivery Order` | No | number | Row order override. Defaults to row position. |
| `Name` | No (recommended) | string | Customer name. |
| `Address` | No (recommended) | string | Street address. |
| `City` | No | string | City. |
| `State` | No | string | State or province. |
| `ZIP` | No | string | Postal code. |
| `Dozens` or `Qty` | No (recommended) | number | Parsed with `Number()`. Non-numeric values fail import. Missing values default to `0`. |
| `Subscribed` | No | boolean | Blank defaults to `true`. `true/yes/1` map to `true`. |
| `Notes` | No | string | Freeform notes. |
| `DonationStatus` | No | enum | `NotRecorded`, `Donated`, `NoDonation`. |
| `DonationMethod` | No | enum | `cash`, `venmo`, `ach`, `paypal`, `other`. |
| `DonationAmount` | No | number | Donation amount for the row (optional). |
| `RowType` | No | string | If present, only `Delivery` rows are imported. |

### RowType values

When `RowType` is present, the import parser only accepts rows where the value is empty or `Delivery` (case-insensitive). Other row types are ignored unless this file is used as a backup restore.

## Backup export and restore format

Backups include baseline columns plus history columns. They always include a `RowType` column.

### RowType values (backup)

- `Delivery`: baseline rows from the original import.
- `RunEntry`: historical run snapshot rows.
- `OneOffDonation`: donation-only events not tied to a run.
- `OneOffDelivery`: delivery events not tied to a run.

### History columns (run and one-off rows)

These columns are appended on export and used during restore.

| Column | Type | Notes |
| --- | --- | --- |
| `RunId` | string | Required for `RunEntry` rows. |
| `RouteDate` | string | Route date label for the run. |
| `ScheduleId` | string | Normalized schedule id for the run. |
| `RunStatus` | string | `completed` or `endedEarly`. |
| `RunBaseRowId` | string | Base row id for the row; required for history rows. |
| `RunDeliveryOrder` | number | Delivery order within the run. |
| `RunEntryStatus` | string | `delivered` or `skipped` (other values are treated as delivered on restore). |
| `RunDozens` | number | Dozens delivered for the event. |
| `RunDonationStatus` | string | `NotRecorded`, `Donated`, `NoDonation`. |
| `RunDonationMethod` | string | `cash`, `venmo`, `ach`, `paypal`, `other`. |
| `RunDonationAmount` | number | Donation amount for the event. |
| `RunTaxableAmount` | number | Deductible portion of the donation. |
| `RunCompletedAt` | string | ISO timestamp of run completion. |
| `EventDate` | string | ISO timestamp for the event; date-only inputs are normalized to ISO at local midday to avoid timezone drift. One-off events saved without changing the default date capture the current timestamp. |
| `SuggestedAmount` | number | Baseline amount used at the time of the event. |

#### EventDate parsing and fallbacks

On restore, `EventDate` is normalized with the same rules used on export:

- ISO timestamps are normalized to ISO.
- `YYYY-MM-DD` date-only values are normalized to ISO at local midday.
- Excel serial numbers (for example, `45215` or `45215.5`) are converted using the 1900 date system.

If `EventDate` is missing or invalid, restore falls back to:

- `RunEntry`: `RunCompletedAt`, then `RouteDate` for the run; if both are missing, the restore timestamp is used.
- `OneOffDonation`/`OneOffDelivery`: the delivery `RouteDate` (Schedule/Date) for the matched base row; if missing, the date remains blank.

### Totals columns

Totals are computed and exported as:

- `TotalDonation`
- `TotalDozens`
- `TotalDeductibleContribution`

Totals reflect the tax year selected on Home at export time. Backup filenames include a `-tax-year-YYYY` suffix to show the year used for totals.

Exports without an import state use `TotalTaxableDonation` instead of `TotalDeductibleContribution`.

## Legacy export (no import state)

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

## Related docs

- `docs/ops/backup-restore.md`
- `docs/reference/data-model.md`
- `docs/reference/glossary.md`
