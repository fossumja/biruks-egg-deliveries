# Biruk’s Egg Deliveries – User Guide

How to use the app day‑to‑day: importing routes, planning, running deliveries, recording donations, and exporting data for your records and taxes. Written for the primary user, not as a developer reference.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2026-01-30
- **Type**: How-to
- **Scope**: end‑to‑end app usage for delivery weeks
- **Non-goals**: developer setup or architectural detail
- **Applies to**: end users of the app

---

## 1. High‑Level Workflow

For each delivery week:

1. **Import** your CSV route file (e.g., “A Week Deliveries 2025.csv”).
2. On the **Planner** page:
   - Review the stops and their order.
   - Adjust dozens if needed.
   - Add, edit, or unsubscribe people if something changed.
3. On the **Run** page:
   - Deliver or skip each stop.
   - Adjust quantity and record donations as you go.
4. When you finish a run:
   - Optionally **Backup CSV** from the Home screen.
   - Tap **Complete run** on the Run page to archive that run and reset the route for next time.
5. At any time:
   - Backup a CSV from Home. The export always contains:
     - All the original columns from your file.
     - All completed runs the app knows about.
     - All one‑off deliveries and donations.
     - Running totals for dozens, donations, and the deductible charitable contribution per person for the selected tax year.

Set the tax year on Home before exporting so the totals and filename match the year you need.
Use the Planner’s **Past runs** or **All receipts** views to review and edit past receipts.

Deductible totals use a global formula: total donations minus the baseline value of delivered dozens at the time of each delivery (never below zero).

You can run many times per year on the same schedule. The app keeps all of that history and totals; if it sees more than one year of data, Home shows a warning to export and start a new file for the new year.

---

## 2. Home Page

The Home page has four main sections:

- **Import / Backup / Restore / Help**
  - **Import CSV**: load a route file from your device and replace the current deliveries and routes.
    - Back up first if you need to keep the current dataset.
  - **Backup CSV**: export everything the app currently knows to a CSV file.
    - Safe to press as often as you like.
  - **Restore CSV**: replace in‑app data with a full backup file.
    - Prompts you to export a backup first, then asks you to tap **Restore CSV** again to pick a file.
    - Restores deliveries, run history, and one‑offs; settings stay the same.
  - **Help**: opens this guide inside the app.
  - The page also shows:
    - **Last backup** timestamp when available.
    - **Imported** and **Restored** timestamps for the current dataset.

- **Tax year**
  - **Tax year selector**: choose the year used for totals and exports.
  - Planner totals and receipt history (including **All receipts**) follow the selected tax year.
  - If the app detects multiple years of data, it shows a warning to export and start a new file for the new year.

- **Settings**
  - **Dark mode**: toggle between light and dark themes.
  - **Keep screen awake**: temporarily hidden on iPhone while wake lock support is unreliable; may return later.
  - **Suggested donation/dozen**: the per‑dozen donation amount used when suggesting donation amounts on the Planner and Run pages.

- **Build info**
  - Shows when the app was built and deployed, so you can see if your PWA is up to date.
  - If an **Update available** prompt appears, tap **Reload** to apply the latest version.

---

## 3. Importing CSV Files

Use the **Import CSV** button on Home.

- The file should have the same columns as your route spreadsheets, including at least:
  - `Schedule` (or `Date`) – used as the route identifier (e.g., “Week A”, “Week B”).
  - `BaseRowId` – unique ID per person (stable across files).
  - `Delivery Order` – order within the route.
  - `Name`, `Address`, `City`, `State`, `ZIP`, `Dozens`, `Subscribed`, `Notes`, etc.
- The app saves all headers and values so they can be exported later in the same order.

**Important:**

- Importing **replaces** the current in‑app data:
  - All current deliveries and route info are cleared.
  - All run history entries are kept, but they’re no longer tied to the new live data if you change `BaseRowId`s.
- If the CSV includes `RowType` rows, import uses only `Delivery` rows. Use **Restore CSV** for full history.
- Use **Restore backup** only when you need a full rebuild:
  - It clears deliveries, routes, and run history and restores them from the backup file.
- Back up before importing if you need the current dataset.

---

## 4. Planner Page

### 4.1. Schedule & Run Selector

- Top dropdown: choose a **route** or a **past run**.
  - **Routes**: `All Schedules` or a specific schedule (e.g., `Week A`, `Week B`).
  - **Past runs**: completed runs for a schedule, plus **All receipts** to review everything at once.
- Selecting a past run or **All receipts** switches the Planner into receipt history view.
- Use **Search** to filter by name or address while staying on the current view.

### 4.2. Current (Live) View

When viewing `Current (live)`:

- Each person appears as a card:
  - Left side: order number (1, 2, 3, …) and drag handle (if reorder is enabled).
  - Top row: name and status pill (Pending, Delivered, Skipped, Changed, Unsubscribed).
  - Bottom row:
    - Left: full address (or “(no address)”).
    - Right: quantity box to increase/decrease dozens.

- Hidden menu (swipe left on a card or tap to open):
  - **Reset**: clear this person’s delivered/skipped state and planned changes, returning them to Pending with original dozens and baseline donation.
  - **Edit**: change name, address, schedule, order in route, dozens, and notes.
    - Use **Unsubscribe** in the edit panel to move someone to the bottom and exclude them from future runs.
  - **Skip** / **Unskip** / **Resubscribe**:
    - Skip for this run or undo a skip.
    - If a stop is unsubscribed, the same button switches to **Resubscribe**.
  - **Donation** (one‑off):
    - Record a one‑off donation (not tied to a specific run state).
  - **Delivery** (one‑off):
    - Record an extra delivery outside of the normal schedule (e.g., extra dozens delivered during the week).
  - One‑off donation/delivery panels default to **None** with an amount of **0**.
    Selecting a method fills the suggested amount; switching back to **None** resets to **0**.
  - One‑off date entry is limited to the selected tax year; change the tax year on Home to add receipts for a different year.

### 4.3. Reordering

- Reordering is controlled by:
  - The **Reorder** button in the Planner header (toggle).
- When reordering is enabled:
  - The left handle shows the grab icon and order number.
  - You can drag by the handle to change order.
- When reordering is disabled:
  - The handle shows only the order number (no grab icon).
  - Dragging is disabled to avoid accidental movement while scrolling.
- Reordering is disabled automatically for **All Schedules** and while search is active.

### 4.4. Past Runs and Receipts

- **Past runs** show archived delivery entries for a specific run.
- **All receipts** aggregates receipts across runs and one‑offs for the selected tax year.
- Each entry shows status, dozens, donation, and date; use **Edit** to adjust receipts.
- To remove a mistaken receipt:
  - Use **Delete** in the run history action row for **Past runs** or **All receipts**.
  - In one‑off donation/delivery modals, use **Delete** next to the receipt history row.
  - Deletion requires confirmation and immediately updates totals and exports.

---

## 5. Run Page

The Run page is for the actual delivery day.

- Shows the **current stop**:
  - Name, address, note.
  - Status pill.
  - Quantity (dozens).
  - Donation controls: None / Cash / ACH / Venmo / PayPal / Other, plus amount.
    - Default is **None** with an amount of **0**.
    - Selecting a method fills the suggested amount; switching back to **None** resets to **0**.
  - `Copy` and `Open Map` buttons next to the address.
- Shows **Next up** card for the upcoming stop (name, address, dozens).
- Bottom bar:
  - **Deliver** button:
    - Marks the stop as delivered with the current quantity and donation.
    - Moves to the next stop.
  - **Skip** button:
    - Opens a dialog to choose a skip reason or type your own.
    - Marks the stop as skipped and moves to the next.
  - **End Run** button:
    - Opens a confirmation dialog and, if confirmed, marks all remaining stops as skipped (“Ended run early”).

### Completing a Run

When all stops are delivered or skipped (or after you end the run early), the page shows:

- **Backup now**:
  - Exports a CSV snapshot (recommended but not required).
- **Complete run**:
  - Archives this run:
    - Saves one row per person (delivered/skipped status, dozens, donation, taxable amount) into run history.
  - Resets the live route so all stops go back to Pending with baseline dozens and donation.
  - After this, the run appears in the Planner’s run selector.
  - Returns to the Home page.

You can run the same schedule again later. Each completed run adds another entry to the history; totals accumulate across them.

---

## 6. One‑Off Deliveries and Donations

From the Planner hidden menu:

- **Donation**:
    - Record a donation for that person that is **not tied to a specific route run**.
    - You choose method and amount; the app computes the deductible charitable contribution (amount minus the suggested donation).
    - Choose an **event date** (defaults to today). Dates must be within the range shown in the picker (earliest data year through next year).
- **Delivery**:
  - Record an extra delivery outside of the normal schedule.
  - Allows you to specify dozens and donation for that one‑off event.
  - Choose an **event date** (defaults to today). Dates must be within the range shown in the picker (earliest data year through next year).
  - The modal shows a compact history list of prior receipts (deliveries, donations, skips) for that person.

These one‑offs:

- Do not change the main run status (Pending/Delivered/Skipped).
- Are included in per‑person totals and the CSV export.
- One‑off donations add dollars only; dozens totals come only from deliveries (runs and one‑off deliveries).

---

## 7. Resets and Safety

- **Individual Reset (Planner hidden menu → Reset)**:
  - Clears the current run status, delivered dozens, timestamps, and donation overrides for that person.
  - Keeps unsubscribed state.
  - Does **not** touch run history or one‑off history.

- **Run Completion**:
  - Use **Complete run** on the Run page instead of resetting the route manually.
  - This archives the run to history and automatically resets the route.

- **Restore protection**:
  - Restoring a backup always prompts for confirmation.
  - If data is already loaded, the app offers to export a backup before restore.

---

## 8. Exporting for Taxes and Records

The **Backup CSV** export is your master snapshot. Totals are scoped to the tax year selected on Home, and the filename includes that tax year.

Per person, it includes:

- All original columns from your CSV (for reference).
- Run‑level state for each run (depending on how many runs you’ve completed).
- Totals for the selected tax year:
  - `TotalDozens` – dozens from:
    - Imported totals from your original file (if present),
    - All runs completed in the app,
    - All one‑off deliveries,
    - Delivered stops in the current (not yet completed) run.
  - `TotalDonation` – total donation amount across all of the above.
  - `TotalDeductibleContribution` – donation above the suggested amount across all of the above.

This means:

- You can use a single end‑of‑year export to build donor receipts and tax summaries.
- You can still export more frequently (e.g., after each run) for peace of mind.

---

## 9. Recommended Habit

For each run:

1. Import/update your CSV as needed.
2. Plan on the Planner page.
3. Run deliveries on the Run page.
4. When finished:
   - Tap **Backup now**.
   - Tap **Complete run**.
5. At year‑end:
   - Set the tax year on Home.
   - Backup a final CSV.
   - Use it to build donor and tax statements.

The app keeps all of the history in between. You can safely run many deliveries before exporting again, as long as you don’t import a new CSV in the meantime.
