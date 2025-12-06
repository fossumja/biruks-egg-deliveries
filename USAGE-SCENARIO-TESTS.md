# Usage-Focused Scenario Tests – Biruk's Egg Deliveries

This document describes realistic, end-to-end scenarios that exercise the app the way you actually use it on delivery days. The goal is to validate that:

- One-time donations and deliveries (via the Planner hidden menu) are captured correctly.
- Full delivery runs on the Run page record status, quantity, and donation info as expected.
- The exported CSV reflects exactly what happened across runs and one-off entries.

These are intended as **manual** tests you can walk through periodically, especially after bigger changes.

Over time, we want these scenarios to be **fully automated**. The TODO plan below describes how to get there.

---

## TODO – Automation Plan for Usage Scenarios

High-level goal: for each scenario in this file, create an automated test that:

- Seeds a small, known dataset (a “mini CSV” equivalent) via `StorageService.importDeliveries`.
- Replays the same sequence of actions that you would do through the UI (by calling `StorageService` and/or key component methods).
- Runs the export code and asserts that the exported data matches expected totals, statuses, and order.

### Phase 1 – Data-Level Scenario Runner (no UI)

1. **Create a small test dataset**
   - [ ] Define a JSON/TS fixture representing a very small route (e.g., 5–10 customers) with realistic columns.  
         Suggested location: `src/testing/fixtures/mini-route.fixture.ts`.
   - [ ] Write a helper that uses `StorageService.importDeliveries` to load this fixture into an in-memory Dexie DB for tests.  
         Suggested location: `src/testing/test-db.utils.ts` with functions like:
         - `createTestDb(): Dexie`
         - `seedMiniRoute(storage: StorageService): Promise<void>`

2. **Expose a scenario runner API**
   - [ ] Add a `scenario-runner.spec.ts` (or similar) that:
     - [ ] Calls `importDeliveries` with the test fixture.
     - [ ] Provides helper functions that mimic UI actions using `StorageService`:
       - `deliverStop(id, options)` → calls `markDelivered` with qty/donation overrides.
       - `skipStop(id, reason)` → calls `markSkipped`.
       - `addOneOffDonation(id, donationInfo)` → writes into `oneOffDonations`.
       - `addOneOffDelivery(id, deliveryInfo)` → writes into `oneOffDeliveries`.
       - `unsubscribe(id)` / `resubscribe(id)` → update subscribed/status fields as Planner does.
       - `reorderStops(orderMap)` → uses `saveSortOrder`.

     These helpers should be pure TypeScript functions that accept IDs and payloads and can be reused across multiple scenario tests.

3. **Automate Scenarios 1–7 via the runner**
   - [ ] Scenario 1 (Baseline full run):
     - [ ] Use the runner helpers to simulate a full run with Delivered/Skipped only.
     - [ ] Call the CSV export helper and assert:
       - [ ] Status, delivered qty, and donation fields match expectations for each test customer.
   - [ ] Scenario 2 (Full run with mixed donations/quantity changes):
     - [ ] Simulate the described patterns (Customers A–D) using runner helpers.
     - [ ] Export and assert delivered qty, donation method, donation amount.
   - [ ] Scenario 3 (Hidden one-off donations, no run):
     - [ ] Simulate one‑off donations only (no `markDelivered/markSkipped`).
     - [ ] Export and assert:
       - [ ] Run status untouched.
       - [ ] Total Donations reflects the one-offs.
   - [ ] Scenario 4 (Hidden one-off deliveries):
     - [ ] Simulate one‑off deliveries with quantities and donations.
     - [ ] Export and assert total dozens + donations include these entries.
   - [ ] Scenario 5 (Unsubscribe / Resubscribe and progress):
     - [ ] Simulate unsubscribe(s), one-off donations, resubscribe, and another “run”.
     - [ ] Export and assert:
       - [ ] Correct status (“Unsubscribed” vs resubscribed).
       - [ ] Totals reflect both runs and one-offs.
   - [ ] Scenario 6 (Order in route + drag reorder):
     - [ ] Simulate reordering via `saveSortOrder`.
     - [ ] Export and assert CSV order matches the new ordering.
   - [ ] Scenario 7 (Multiple runs with interleaved one-offs):
     - [ ] Run the sequence of Run1 → one-offs → Run2 → one-offs → Run3 using the helpers.
     - [ ] Capture virtual “export snapshots” after each step and assert cumulative totals.

4. **Centralize CSV export testing**
   - [ ] Factor out the CSV writer into a testable function (if not already).  
         Example: `exportToRows(storage: StorageService): Promise<ExportRow[]>` in a file like `src/app/services/export.utils.ts`.
   - [ ] In the scenario tests, call that function directly with the current DB state and compare the resulting rows/objects to expected values:
        - Either compare to hard-coded expected objects, or
        - Compare numerical aggregates (total dozens, total donations) and key status fields for specific test IDs.

### Phase 2 – Component-Level Automation (Planner & Run)

5. **Planner component tests**
   - [ ] Set up `RoutePlannerComponent` in TestBed with a mocked `StorageService`.  
         Suggested spec file: `src/app/pages/route-planner.component.spec.ts`.
   - [ ] For a few key scenarios:
     - [ ] Drive the component (click hidden menu, open Donation/Delivery, edit order) using Angular’s testing utilities.
     - [ ] Assert that the correct `StorageService` helper methods were called in the right order.
     - [ ] Optionally, assert on component state (e.g., `donationModalStop`, `offScheduleStop`, `editingStop`).

6. **Run component tests**
   - [ ] For `DeliveryRunComponent` + `StopDeliveryCardComponent`:  
         Suggested spec files: `src/app/pages/delivery-run.component.spec.ts`, `src/app/components/stop-delivery-card.component.spec.ts`.
     - [ ] Simulate qty/donation changes and verify status pill text.
     - [ ] Simulate Deliver/Skip actions and verify calls to `StorageService.markDelivered` / `markSkipped`.

### Phase 3 – Optional E2E (UI-Driven) Tests

7. **Choose an E2E framework (later)**
   - [ ] If desired, add Cypress/Playwright tests that:
    - [ ] Launch the app, import a small CSV (or inject the mini fixture), and run through a short subset of these scenarios via the browser.
    - [ ] Trigger an export and parse the downloaded CSV in the test to assert on totals.

In short, Phase 1 ensures the **data and export** layer behaves correctly across all scenarios; Phases 2 and 3 gradually add confidence that the UI correctly drives those same behaviors.

---

## General Setup (for all scenarios)

1. **Start from a clean state (optional but recommended)**
   - Clear the app’s local storage / IndexedDB (or start from a fresh browser profile).
   - Ensure no previous routes are loaded.

2. **Import a real route file**
   - On **Home**, import your current CSV (e.g., `A Week Deliveries 2025.csv`).
   - Confirm:
     - The route(s) appear under the route selector.
     - Counts look reasonable (total stops match the file).

3. **Set the suggested donation rate**
   - On **Home**, set the “Suggested donation/dozen” to your normal value (e.g., `$4`).
   - This will be used throughout all scenarios.

4. **Pick the route to test**
   - On **Planner**, choose a single route (e.g., `Week A` / a specific date).
   - Leave “All Schedules” for separate tests later.

5. **Export naming convention**
   - When exporting after each scenario, save the CSV with a descriptive name:
     - e.g., `run1-baseline.csv`, `run2-donations.csv`, `run3-oneoffs.csv`, etc.

---

## Scenario 1 – Baseline Full Run (No One-Offs)

**Goal:** Verify the “normal” run flow and export with no one-off donations/deliveries.

Steps:
1. **Planner**
   - Do not adjust quantities or use the hidden menu at all.
   - Optionally reorder a few stops using the drag handle; this is to ensure order is preserved.

2. **Run page**
   - Start a run for the chosen route.
   - For the first ~10 stops:
     - Mark some as **Delivered** with default quantity and “No Donation”.
     - Mark some as **Skipped** (choose a simple skip reason like “Not home”).
   - Complete the run (advance through all stops) so it reaches the end.

3. **Export**
   - Export to CSV after the run.
   - Manually check for a handful of customers:
     - Their **status** matches (Delivered / Skipped).
     - Their **delivered quantity** matches the original quantity.
     - **Donation** fields show “No Donation” and zero or blank amounts.
   - Confirm that:
     - Route order in the CSV matches the final order in the Planner.
     - Unsubscribed (if any initially present) are still marked correctly and included in the CSV.

---

## Scenario 2 – Full Run with Mixed Donations and Quantity Changes

**Goal:** Ensure donation type, amount, and quantity changes during a run are recorded and exported.

Steps:
1. **Planner – Set baselines**
   - Pick 8–10 customers to use for this scenario.
   - On the Planner page, leave their planned quantity at the CSV value.
   - Note their names and initial dozens.

2. **Run page – Vary behavior**
   - For each of the selected customers, do the following patterns:
     - **Customer A**:
       - Increase dozens by 1 (e.g., from 2 to 3).
       - Set donation type to **Cash**; leave amount at suggested.
     - **Customer B**:
       - Decrease dozens by 1 (if possible).
       - Set donation type to **ACH**; override amount to a non-default (e.g., suggested + 2).
     - **Customer C**:
       - Keep dozens the same.
       - Set donation type to **Venmo** with default suggested amount.
     - **Customer D**:
       - Keep dozens the same.
       - Toggle a donation type on and then off (ending with “No Donation”).
   - Complete the run for the route.

3. **Export**
   - Export to CSV (`run2-donations.csv`).
   - For each test customer, verify:
     - **Delivered quantity** matches the value used on the Run page.
     - **Donation status** and **method** match what you selected.
     - **Donation amount** equals the adjusted amount (or the suggested amount if you left it).
   - Confirm the **Changed/Pending** status resolved to “Delivered” after the run.

---

## Scenario 3 – Hidden-Menu One-Off Donations (No Run)

**Goal:** Ensure one-off donations via the Planner’s hidden menu are tracked and exported without changing run status.

Steps:
1. **Planner – Choose customers**
   - Pick 3–5 customers, ideally with different schedules.

2. **Planner – Use hidden Donation**
   - For each chosen customer:
     - Swipe to reveal hidden menu and tap **Donation**.
     - In the donation modal:
       - Choose a method (e.g., ACH, PayPal, Other).
       - Set a specific amount (e.g., $10, $25, $40).
       - Save the donation.
   - Do **not** change their run status (don’t mark them delivered/ skipped on the Run page).

3. **Export**
   - Export to CSV (`run3-oneoff-donations.csv`).
   - For each tested customer:
     - Confirm **run status** remains as it was before (typically Pending).
     - Confirm a **Total Donations** column or equivalent reflects the one-off amount.
     - Confirm **Total Dozen** includes only what’s expected (either 0 if you never ran deliveries, or previously run totals from earlier scenarios).

4. (Optional) **Repeat on a different day**
   - A week later, record additional one-off donations for the same customers.
   - Export again; totals should be cumulative across both dates.

---

## Scenario 4 – Hidden-Menu One-Off Deliveries

**Goal:** Validate one-off deliveries (quantity + donation) that are not tied to a run, and their totals.

Steps:
1. **Planner – Choose customers**
   - Pick 3 customers for one-off deliveries (e.g., extra deliveries outside schedule).

2. **Planner – Use hidden Delivery**
   - For each:
     - Swipe → tap **Delivery**.
     - In the delivery card:
       - Adjust quantity (e.g., 1.5× their typical dozens).
       - Choose a donation type and amount (e.g., Cash, PayPal).
       - Save.
   - Do **not** mark these customers as delivered on the Run page.

3. **Export**
   - Export to CSV (`run4-oneoff-deliveries.csv`).
   - Verify:
     - Run status remains Pending/unchanged.
     - Total Dozen and Total Donations include the one-off deliveries and their donation amounts.
     - If you previously ran Scenario 2/3, these totals should now be the sum of:
       - Run deliveries + one-off donations + one-off deliveries.

---

## Scenario 5 – Unsubscribe / Resubscribe and Progress

**Goal:** Check how unsubscribed people affect runs, hidden menus, and export.

Steps:
1. **Planner – Unsubscribe a few customers**
   - Use the Edit flow and tap **Unsubscribe** for 2–3 customers:
     - Verify they move to the end of the list.
     - Status pill shows “Unsubscribed”.

2. **Planner – One-off donations for unsubscribed**
   - Use hidden **Donation** on one unsubscribed customer.
   - Save a donation without resubscribing them.

3. **Run page**
   - Start a run on the route.
   - Confirm unsubscribed people:
     - Do not appear as active stops, or are clearly marked unsubscribed.
     - Are not counted in the delivered/total progress numbers in the header.

4. **Resubscribe and run again**
   - Back on Planner, **Resubscribe** one of the customers.
   - Run again and complete a delivery for them.

5. **Export**
   - Export to CSV (`run5-unsubscribe.csv`).
   - Verify:
     - Unsubscribed customers are still present, with “Unsubscribed” status where appropriate.
     - Resubscribed customers show the new run deliveries.
     - Totals include both one-off and run data.

---

## Scenario 6 – Order in Route & Drag Reorder Combined

**Goal:** Make sure order editing and drag-and-drop produce a stable, consistent ordering that matches export.

Steps:
1. **Planner – Use “Order in route”**
   - Edit a few customers:
     - Move one from position 20 to 2.
     - Move one from 5 to 15.
   - Confirm the Planner list updates as expected.

2. **Planner – Drag reorder**
   - Use the drag handle to move several people around the list.
   - Confirm the positions update and the next “Order in route” values reflect the new ordering (1-based).

3. **Export**
   - Export to CSV (`run6-ordering.csv`).
   - Verify:
     - The order of rows in the CSV matches what you see in the Planner.
     - There are no gaps or duplicates in the internal ordering (this may be visible via the export’s order columns, if present).

---

## Scenario 7 – Multiple Full Runs with Interleaved One-Offs

**Goal:** Simulate how you actually use the app over time: several full runs with one-off donations and deliveries both between runs and during runs, and confirm exports reflect the cumulative history.

### Run 1 – Baseline + light variation

1. **Planner**
   - Import a fresh CSV (or reuse the same route as earlier scenarios).
   - Optionally adjust a few planned dozens on Planner to simulate last-minute changes.

2. **Run page (Run 1)**
   - Complete a full run:
     - Mix Delivered and Skipped as in Scenario 1.
     - Use only “No Donation” or very simple donations for this first run.

3. **Export**
   - Export as `run7-1-baseline.csv`.
   - Keep this file as the baseline for comparison.

### Between Run 1 and Run 2 – One-off donations and deliveries

4. **Planner – Hidden one-offs**
   - On the same route and/or other schedules:
     - Record several one-off donations (hidden **Donation**).
     - Record several one-off deliveries (hidden **Delivery**) with their own quantities and donation methods.
   - Do not start a Run between these actions.

5. **Export**
   - Export as `run7-2-between.csv`.
   - Verify for a few customers:
     - Total Donations and Total Dozen increased from `run7-1-baseline.csv` by exactly the one-off values you added.
     - Run status (Delivered / Skipped / Pending) from Run 1 is unchanged.

### Run 2 – Full run with donations during the run

6. **Run page (Run 2)**
   - Start a new run on the same route.
   - For several stops:
     - Adjust quantities up or down.
     - Choose donation types and adjust amounts during the run.
     - Skip a few stops for realistic variety.
   - Complete the run.

7. **Export**
   - Export as `run7-3-after-run2.csv`.
   - For test customers, check:
     - Delivered quantities reflect the latest run.
     - Donation totals now equal:
       - Run 1 donations + between-run one-offs + Run 2 donations.
     - Total Dozen includes both runs and one-off deliveries.

### Between Run 2 and Run 3 – More one-offs and unsubscribes

8. **Planner**
   - Unsubscribe one or two customers and add one-off donations for them.
   - Add more one-off deliveries for a few active customers.

9. **Export**
   - Export as `run7-4-between2.csv`.
   - Verify:
     - Unsubscribed customers show “Unsubscribed” and are excluded from progress logic.
     - Totals again increased by the one-offs just added.

### Run 3 – Final run to close the loop

10. **Run page (Run 3)**
    - Resubscribe one of the unsubscribed customers and include them in Run 3.
    - Complete another full run with mixed deliveries, skips, and donations.

11. **Final Export**
    - Export as `run7-5-final.csv`.
    - For a handful of customers with complex histories (multiple runs + one-offs):
      - Verify their Total Dozen and Total Donations equal the sum of:
        - All run deliveries’ dozens/donations across Runs 1–3.
        - All one-off donations and deliveries between runs.
      - Confirm their final status (Delivered / Skipped / Unsubscribed / Pending) matches what you see in the app.

## How to Use This Document

- Run these scenarios occasionally (e.g., before a season, after big code changes).
- Save each export with a clear name and keep them in a folder for comparison.
- If something doesn’t match expectations (e.g., totals off, statuses mismatched), note:
  - Which scenario and step you were on.
  - The customer name(s) affected.
  - The expected vs actual values.
- That information can then be used to locate and fix the exact code path (StorageService, Planner/Run components, or export logic). 

---

## Automating These Scenarios (Future Work)

These usage scenarios can gradually be turned into automated tests by:

- **Data-level simulation (preferred first step)**
  - Write integration-like unit tests that:
    - Seed the in-memory DB using `StorageService.importDeliveries`.
    - Call `StorageService` methods in the same sequence as above (markDelivered, markSkipped, one-off donation/delivery writes, unsubscribe/resubscribe, addDelivery, saveSortOrder, etc.).
    - Invoke the same CSV export helper used by the app.
  - Assert that the resulting CSV rows (or parsed objects) match the expected totals and statuses for a small synthetic dataset.

- **High-level component tests**
  - For key flows (Planner hidden menu, Run card), add Angular component tests that:
    - Render the component with a test store.
    - Trigger the same actions as in these scenarios (clicks, changes).
    - Check the interactions with `StorageService` and local component state.

- **End-to-end tests (optional, later)**
  - Use a browser automation tool (e.g., Cypress/Playwright) to:
    - Drive the UI as you would on a real run (import CSV, Planner edits, Run actions).
    - Trigger an export and parse the CSV in the test to assert key totals.

The manual scenarios in this file are the blueprint; automation would replay the same sequences programmatically against a small, fixed dataset and assert on the exported results. 
