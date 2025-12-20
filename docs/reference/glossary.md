# Glossary

Definitions for domain terms, UI labels, and data concepts used in this app.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: terms used across the app and documentation
- **Non-goals**: implementation details or code-level API docs
- **Applies to**: product terminology and user-facing labels

## Scope

Use these terms consistently in docs, UI copy, and ADRs.

## Terms

| Term | Definition |
| --- | --- |
| BaseRowId | Stable per-customer identifier from the CSV import used to join history and totals. |
| Delivery (stop) | A planned delivery record for a customer, displayed as a stop in Planner/Run pages. |
| Route / Schedule | A grouping of deliveries by the CSV’s schedule/date value (e.g., “Week A”). |
| RouteDate | The raw schedule/date value from the CSV used to group stops. |
| Run | A completed (or ended-early) execution of a route; stored as a snapshot. |
| Run entry | A per-stop snapshot row captured when a run is completed. |
| Live run | The current in-app state stored in deliveries; editable until completed. |
| Complete run | Action that archives run entries and resets the live route for next time. |
| End run early | Action that marks remaining stops skipped and finishes the run. |
| One-off donation | A donation not tied to a delivery event; affects totals but not dozens. |
| One-off delivery | An extra delivery outside the normal schedule; affects dozens and totals. |
| Suggested rate | The per-dozen donation rate set in Settings. |
| Baseline value | Dozens delivered multiplied by the suggested rate at the time of delivery. |
| Deductible contribution | `max(0, totalDonation − totalBaselineValue)` across all receipts. |
| Pending | Stop status meaning no delivery/skip recorded yet (stored as empty status). |
| Delivered | Stop status meaning the delivery was completed. |
| Skipped | Stop status meaning the delivery was skipped. |
| Changed | Stop status for a customer whose details or plan changed for the run. |
| Unsubscribed | Customer no longer receives deliveries; kept for history. |
| Planner | The planning view to reorder, edit, and manage stops. |
| Run page | The delivery-day view to deliver/skip each stop. |

## Related docs

- `docs/architecture/architecture-overview.md`
- `docs/user/user-guide.md`
- `docs/reference/data-model.md`
