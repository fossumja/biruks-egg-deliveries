# Glossary

Definitions for domain terms, UI labels, and data concepts used in this app.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-23
- **Type**: Reference
- **Scope**: terms used across the app, CSV formats, and documentation
- **Non-goals**: implementation details or code-level API docs
- **Applies to**: product terminology and user-facing labels

## Summary

Use these terms consistently in docs, UI copy, and ADRs.

## Terms

| Term | Definition |
| --- | --- |
| All receipts | The history view that combines run entries and one-off receipts across routes. |
| BaseRowId | Stable per-customer identifier from the CSV import used to join history and totals. |
| Baseline value | Suggested amount per dozen multiplied by delivered dozens for a receipt. |
| Backup (CSV) | Export file that includes `RowType` rows for deliveries, run entries, and one-offs. |
| Changed | Delivery status indicating the stop's dozens or donation details differ from the imported baseline. |
| Complete run | Action that archives run entries and resets the live route for next time. |
| Deductible contribution | `max(0, totalDonation - totalBaselineValue)` across receipts; stored as taxable amounts in exports. |
| Delivered | Stop status meaning the delivery was completed. |
| Delivery (stop) | A planned delivery record for a customer, displayed as a stop in Planner/Run pages. |
| End run early | Action that marks remaining stops skipped and finishes the run. |
| Import state | Stored CSV headers and raw row values used to preserve extra columns on export. |
| Live run | The current in-app state stored in deliveries; editable until completed. |
| One-off donation | A donation not tied to a delivery event; affects totals but not dozens. |
| One-off delivery | An extra delivery outside the normal schedule; affects dozens and totals. |
| Pending | Stop status meaning no delivery/skip recorded yet; includes empty and `changed` statuses. |
| Planner | The planning view to reorder, edit, and manage stops. |
| Receipt | Any event that contributes to totals: run entries, one-off donations, or one-off deliveries. |
| Route / Schedule | A grouping of deliveries by the CSV schedule/date value (for example, `Week A`). |
| RouteDate | The raw schedule/date value from the CSV used to group stops. |
| Run | A completed (or ended-early) execution of a route; stored as a snapshot. |
| Run entry | A per-stop snapshot row captured when a run is completed. |
| Run page | The delivery-day view to deliver/skip each stop. |
| RowType | CSV column that distinguishes delivery rows from history rows in backups. |
| ScheduleId | Normalized schedule label (route date with whitespace removed) used for run history. |
| Skipped | Stop status meaning the delivery was skipped. |
| Suggested amount | The baseline amount for a receipt at the time it was recorded. |
| Suggested rate | The per-dozen donation rate set in Settings. |
| Subscribed | A customer marked as active (`true`); `false` stops are treated as unsubscribed. |
| Tax year | Year used to filter totals during export. |
| Taxable amount | The portion of a donation above the suggested amount; exported as `RunTaxableAmount`. |
| Unsubscribed | Customer no longer receives deliveries; kept for history. |

## Related docs

- `docs/architecture/architecture-overview.md`
- `docs/user/user-guide.md`
- `docs/reference/data-model.md`
