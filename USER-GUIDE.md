# Biruk’s Egg Deliveries – User Guide

This guide explains how to use the app day‑to‑day: importing routes, planning, running deliveries, recording donations, and exporting data for your records and taxes.

It’s written for you as the user, not as a developer.

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
   - Optionally **Backup (CSV)** from the Home screen.
   - Tap **Complete run** on the Run page to archive that run and reset the route for next time.
5. At any time:
   - Export a CSV from Home. The export always contains:
     - All the original columns from your file.
     - All completed runs the app knows about.
     - All one‑off deliveries and donations.
     - Running totals for dozens, donations, and taxable donations per person.

You can run many times per year on the same schedule. The app keeps all of that history and totals until you choose to import a brand new CSV.

---

## 2. Home Page

The Home page has three main sections:

- **Import / Backup / Help**
  - **Import CSV**: load a route file from your device.
    - If you already have real data in the app, you’ll see a warning and the app will offer to back up before replacing it.
  - **Backup (CSV)**: export everything the app currently knows to a CSV file.
    - Safe to press as often as you like.
  - **Help**: opens this guide inside the app.
  - The page also shows:
    - **Last backup** timestamp (only when the last backup matches the current data).
    - **Imported** timestamp for when the current dataset was loaded.

- **Settings**
  - **Dark mode**: toggle between light and dark themes.
  - **Drag to reorder on Planner**: when ON, you can drag people on the Planner to change their order; when OFF, drag is disabled to avoid accidental moves.
  - **Keep screen awake**: attempts to keep your screen on while using the app (depending on device support).
  - **Suggested donation/dozen**: the per‑dozen donation amount used when suggesting donation amounts on the Planner and Run pages.

- **Build info**
  - Shows when the app was built and deployed, so you can see if your PWA is up to date.

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
- If the app sees that you already have real data, it will:
  1. Ask if you want to back up.
  2. Run a backup before letting you pick a new file (two taps on Import: one to back up, one to choose).

---

## 4. Planner Page

### 4.1. Schedule & Run Selector

- Top dropdown: choose which **schedule** to view (e.g., `Week A`, `Week B`, or `All Schedules`).
- When a single schedule is selected and you have completed runs:
  - A **Run selector** appears:
    - `Current (live)` – shows the editable route for the next run.
    - `Run – YYYY‑MM‑DD` entries – show past runs for that schedule in a read‑only view.

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
  - **Skip** / **Unskip** / **Resubscribe**:
    - Skip for this run or undo a skip.
    - Unsubscribe moves someone to the bottom of the list and marks them as “Unsubscribed” for future runs.
  - **Donation** (one‑off):
    - Record a one‑off donation (not tied to a specific run state).
  - **Delivery** (one‑off):
    - Record an extra delivery outside of the normal schedule (e.g., extra dozens delivered during the week).

### 4.3. Reordering

- Reordering is controlled by:
  - The **Drag to reorder on Planner** setting on Home (default behavior), and
  - The **Reorder** button in the Planner header (per‑session toggle).
- When reordering is enabled:
  - The left handle shows the grab icon and order number.
  - You can drag by the handle to change order.
- When reordering is disabled:
  - The handle shows only the order number (no grab icon).
  - Dragging is disabled to avoid accidental movement while scrolling.

---

## 5. Run Page

The Run page is for the actual delivery day.

- Shows the **current stop**:
  - Name, address, note.
  - Status pill.
  - Quantity (dozens).
  - Donation controls: None / Cash / ACH / Venmo / PayPal / Other, plus amount.
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
- **Done**:
  - Returns to the Home page.

You can run the same schedule again later. Each completed run adds another entry to the history; totals accumulate across them.

---

## 6. One‑Off Deliveries and Donations

From the Planner hidden menu:

- **Donation**:
  - Record a donation for that person that is **not tied to a specific route run**.
  - You choose method and amount; the app computes the taxable portion (amount minus the suggested donation).
- **Delivery**:
  - Record an extra delivery outside of the normal schedule.
  - Allows you to specify dozens and donation for that one‑off event.

These one‑offs:

- Do not change the main run status (Pending/Delivered/Skipped).
- Are included in per‑person totals and the CSV export.

---

## 7. Resets and Safety

- **Individual Reset (Planner hidden menu → Reset)**:
  - Clears the current run status, delivered dozens, timestamps, and donation overrides for that person.
  - Keeps unsubscribed state.
  - Does **not** touch run history or one‑off history.

- **Run Completion**:
  - Use **Complete run** on the Run page instead of resetting the route manually.
  - This archives the run to history and automatically resets the route.

- **Import protection**:
  - If the app detects that real data is already loaded and you press Import:
    - It asks you to export a backup first.
    - Only after that can you pick a new CSV.

---

## 8. Exporting for Taxes and Records

The **Backup (CSV)** export is your master snapshot.

Per person, it includes:

- All original columns from your CSV (for reference).
- Run‑level state for each run (depending on how many runs you’ve completed).
- Cumulative totals:
  - `TotalDozens` – dozens from:
    - Imported totals from your original file (if present),
    - All runs completed in the app,
    - All one‑off deliveries,
    - Any in‑progress run that hasn’t yet been completed.
  - `TotalDonation` – total donation amount across all of the above.
  - `TotalTaxableDonation` – donation above the suggested amount across all of the above.

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
   - Export a final CSV.
   - Use it to build donor and tax statements.

The app keeps all of the history in between. You can safely run many deliveries before exporting again, as long as you don’t import a new CSV in the meantime.

