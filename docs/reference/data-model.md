# Data Model Reference

Reference for the stable data entities and core types used in the app.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-23
- **Type**: Reference
- **Scope**: TypeScript model interfaces used in storage, CSV import/export, and UI
- **Non-goals**: database migration details or service method behavior
- **Applies to**: `src/app/models/*.ts`

## Summary

This document lists the canonical model interfaces and their intent. For field-level behavior and defaults, refer to the source model files and related services.

## Contract

### Core types

Defined in `src/app/models/delivery.model.ts`:

- `DeliveryStatus`: `'' | 'changed' | 'delivered' | 'skipped'` (`''` is pending, `changed` means the stop was edited from baseline).
- `DonationStatus`: `'NotRecorded' | 'Donated' | 'NoDonation'`.
- `DonationMethod`: `'cash' | 'venmo' | 'ach' | 'paypal' | 'other'`.

### Entities

#### Delivery

Represents a single stop in the current live route.

Key fields:

- `id`: unique delivery id.
- `runId`: live route id (defaults to `routeDate` on import).
- `baseRowId`: stable per-customer id from CSV (`BaseRowId` or generated `ROW_{index}`).
- `routeDate`: schedule/date label from the CSV.
- `week`: normalized schedule id (routeDate with whitespace removed).
- `name`, `address`, `city`, `state`, `zip`: customer details.
- `dozens`, `originalDozens`, `deliveredDozens`: planned, imported baseline, and delivered quantities.
- `deliveryOrder`, `sortIndex`: per-route ordering used in Planner/Run views (normalized on import).
- `subscribed`: whether the customer is active; `false` marks an unsubscribed stop.
- `status`: delivery status for the live run (`''`, `changed`, `delivered`, `skipped`).
- `donation`, `originalDonation`: current and baseline donation data.
- `oneOffDonations`: donation-only receipts (`DonationInfo[]` with `date`).
- `oneOffDeliveries`: extra delivery receipts with `deliveredDozens`, `donation`, `date`.
- `notes`, `skippedReason`: freeform text.
- Timestamps: `createdAt`, `updatedAt`, `deliveredAt`, `skippedAt`.
- `synced`: optional flag used for sync state.

Source: `src/app/models/delivery.model.ts`.

#### DonationInfo

Embedded donation data for deliveries and one-offs.

Key fields:

- `status`, `method`, `amount`.
- `suggestedAmount`: baseline amount at time of the event.
- `taxableAmount`: amount above suggested (deductible contribution).
- `date`: event timestamp (used for one-off receipts).
- `note`: freeform note.

Source: `src/app/models/delivery.model.ts`.

#### Route

Summary row for a route group.

Key fields:

- `routeDate`: route/schedule identifier.
- `name`: optional display label.
- `totalStops`, `deliveredCount`, `skippedCount`.
- `currentIndex`: last active stop index.
- `completed`: whether all stops are resolved.
- `createdAt`, `lastUpdatedAt`: timestamps.

Source: `src/app/models/route.model.ts`.

#### DeliveryRun

Snapshot metadata for a completed or ended-early run.

Key fields:

- `id`: run identifier in the format `{routeDate}_{isoTimestamp}`.
- `date`: completion timestamp.
- `weekType`: normalized schedule id.
- `label`: human-readable run label (route date plus completion date).
- `status`: `completed` or `endedEarly`.
- `routeDate`: original route date/schedule.
- `note`: optional run note.

Source: `src/app/models/delivery-run.model.ts`.

#### RunSnapshotEntry

Per-stop snapshot row for a completed run or one-off history event.

Key fields:

- `runId`: parent run id.
- `baseRowId`: stable per-customer id.
- `status`: `delivered` | `skipped` | `donation` (`donation` represents one-off receipts).
- `dozens`, `deliveryOrder`.
- `donationStatus`, `donationMethod`, `donationAmount`, `taxableAmount`.
- `eventDate`: run date or one-off event date.
- `oneOffKind`, `oneOffIndex`, `deliveryId`: links to one-off source (if applicable).

Source: `src/app/models/run-snapshot-entry.model.ts`.

#### BaseStop

Baseline person/stop data derived from the CSV import.

Key fields:

- `baseRowId`, `name`, `address`, `city`, `state`, `zip`.
- `dozensDefault`: default dozens for the stop.
- `week`: schedule label (if provided).
- `notes`: baseline notes.

Source: `src/app/models/base-stop.model.ts`.

#### CsvImportState

Snapshot of the imported CSV headers and rows.

Key fields:

- `headers`: original CSV header list (order preserved).
- `rowsByBaseRowId`: raw row data keyed by `baseRowId`.
- `mode`: `baseline` for route imports, `restored` for backup restores.

Source: `src/app/models/csv-import-state.model.ts`.

## Related docs

- `docs/architecture/architecture-overview.md`
- `docs/reference/csv-format.md`
- `docs/reference/glossary.md`
