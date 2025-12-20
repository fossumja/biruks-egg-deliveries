# Data Model Reference

Reference for the stable data entities and core types used in the app.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: TypeScript model interfaces used in storage and UI
- **Non-goals**: database migration details or service method behavior
- **Applies to**: `src/app/models/*.ts`

## Scope

This document lists the canonical model interfaces and their intent. For field-level behavior, refer to the source model file.

## Core types

Defined in `src/app/models/delivery.model.ts`:

- `DeliveryStatus`: `'' | 'changed' | 'delivered' | 'skipped'`
- `DonationStatus`: `'NotRecorded' | 'Donated' | 'NoDonation'`
- `DonationMethod`: `'cash' | 'venmo' | 'ach' | 'paypal' | 'other'`

## Entities

### Delivery

Represents a single stop in the current live route.

Key fields:

- `id`: unique delivery id.
- `baseRowId`: stable per-customer id from CSV.
- `routeDate`: schedule/date group for the delivery.
- `dozens`, `deliveredDozens`, `originalDozens`: planned vs delivered quantities.
- `status`: delivery status for the current run.
- `donation`, `originalDonation`: donation info for the run.
- `oneOffDonations`, `oneOffDeliveries`: receipts outside the normal run.
- `deliveryOrder`, `sortIndex`: ordering for route planning.
- Timestamps: `deliveredAt`, `skippedAt`, `createdAt`, `updatedAt`.

Source: `src/app/models/delivery.model.ts`.

### DonationInfo

Embedded donation data for deliveries and one-offs.

Key fields:

- `status`, `method`, `amount`.
- `suggestedAmount`: baseline amount at time of event.
- `taxableAmount`: amount above suggested.
- `date`, `note`.

Source: `src/app/models/delivery.model.ts`.

### Route

Summary row for a route group.

Key fields:

- `routeDate`: route/schedule identifier.
- `totalStops`, `deliveredCount`, `skippedCount`.
- `currentIndex`: last active stop index.
- `completed`: whether all stops are resolved.

Source: `src/app/models/route.model.ts`.

### DeliveryRun

Snapshot metadata for a completed or ended-early run.

Key fields:

- `id`: run identifier.
- `date`: completion timestamp.
- `weekType`: normalized schedule id.
- `label`: human-readable run label.
- `status`: `completed` or `endedEarly`.
- `routeDate`: original route date/schedule.

Source: `src/app/models/delivery-run.model.ts`.

### RunSnapshotEntry

Per-stop snapshot row for a completed run or one-off history event.

Key fields:

- `runId`: parent run id.
- `baseRowId`: stable per-customer id.
- `status`: `delivered` | `skipped` | `donation`.
- `dozens`, `deliveryOrder`.
- `donationStatus`, `donationMethod`, `donationAmount`, `taxableAmount`.
- `eventDate`: run date or one-off event date.
- `oneOffKind`, `oneOffIndex`, `deliveryId`: links to one-off source (if applicable).

Source: `src/app/models/run-snapshot-entry.model.ts`.

### BaseStop

Baseline person/stop data derived from the CSV import.

Key fields:

- `baseRowId`, `name`, `address`, `city`, `state`, `zip`.
- `dozensDefault`: default dozens for the stop.
- `week`: schedule label (if provided).
- `notes`: baseline notes.

Source: `src/app/models/base-stop.model.ts`.

### CsvImportState

Snapshot of the imported CSV headers and rows.

Key fields:

- `headers`: original CSV header list.
- `rowsByBaseRowId`: raw row data keyed by `baseRowId`.
- `mode`: `baseline` or `restored`.

Source: `src/app/models/csv-import-state.model.ts`.

## Related docs

- `docs/architecture/architecture-overview.md`
- `docs/reference/csv-format.md`
- `docs/reference/glossary.md`
