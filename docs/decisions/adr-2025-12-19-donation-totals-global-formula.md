# ADR-2025-12-19 - Donation totals global formula

Defines a global formula for per-customer totals that preserves consistency across UI, run history, and CSV exports. Requires storing per-event suggested amounts to ensure totals remain accurate when rates change.

- **Status**: Stable
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Explanation
- **Scope**: donation totals calculation and export consistency
- **Non-goals**: UI changes unrelated to totals or new backup formats
- **Applies to**: `src/app/**`

## Context

- Current totals sum per-receipt taxable amounts, which yields sum(max(0, amount_i - suggested_i)).
- Totals must match across Planner donation UI, run history, and CSV exports.
- Suggested donation rate can change, so totals must reflect the rate at the time of each delivery.
- One-off donations should add dollars without adding dozens.

## Decision

- Compute per-customer totals using a global formula:
  - totalDonation = sum of all amounts paid
  - totalDozensDelivered = sum of delivered dozens (runs + one-off deliveries)
  - totalBaselineValue = sum(deliveredDozens * suggestedAmountAtTime)
  - totalDeductibleContribution = max(0, totalDonation - totalBaselineValue)
- Store suggestedAmount at the time of each delivery event (run entry and one-off delivery).
- Use a single totals helper for UI and export; backup/restore preserves per-event suggestedAmount.
- One-off donations contribute only to totalDonation.

## Alternatives considered

- Keep per-receipt taxable sums and export those totals.
- Recompute baseline using the current suggested rate only.
- Add a coveredDozens field instead of tracking suggestedAmount per event.
- Store only aggregate totals and discard per-event data.

## Consequences

- Requires data updates to capture suggestedAmount per event.
- CSV backup/restore needs to carry suggestedAmount per receipt.
- Totals become consistent across UI/export and resilient to rate changes.
- Slightly more data stored per event.

## Follow-ups

- Implement the totals helper and update BackupService and Planner donation UI.
- Extend backup/restore columns to persist suggestedAmount.
- Add tests for multi-event totals and rate changes.
