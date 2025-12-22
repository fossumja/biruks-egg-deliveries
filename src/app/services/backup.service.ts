import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import { Delivery } from '../models/delivery.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';
import { StorageService } from './storage.service';
import { normalizeEventDate } from '../utils/date-utils';

@Injectable({ providedIn: 'root' })
export class BackupService {
  constructor(private storage: StorageService) {}

  async exportAll(): Promise<void> {
    const deliveries = await this.storage.getAllDeliveries();
    const importState = await this.storage.getImportState('default');
    const runEntries = await this.storage.getAllRunEntries();
    const totalsMap = this.computeTotalsByBase(
      deliveries,
      runEntries,
      importState ?? undefined
    );
    const runs = await this.storage.getAllRuns();
    const csv = importState
      ? this.toCsvWithImportStateAndHistory(
          deliveries,
          importState,
          totalsMap,
          runs,
          runEntries
        )
      : this.toCsv(deliveries, totalsMap);
    const filename = `BiruksEggDeliveries-${new Date().toISOString().slice(0, 10)}.csv`;
    const file = new File([csv], filename, { type: 'text/csv' });

    if (navigator.share && typeof navigator.share === 'function' && (navigator as any).canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Biruk's Egg Deliveries", text: 'Backup CSV' });
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    const now = new Date().toISOString();
    localStorage.setItem('lastBackupAt', now);
  }

  private toCsv(
    deliveries: Delivery[],
    totalsMap: Map<string, { donation: number; dozens: number; taxable: number }>
  ): string {
    const rows = deliveries.map((d) => ({
      Date: d.routeDate,
      'Delivery Order': d.deliveryOrder,
      Name: d.name,
      Address: d.address,
      City: d.city,
      State: d.state,
      ZIP: d.zip ?? '',
      Dozens: d.dozens,
      Notes: d.notes ?? '',
      Status: d.status,
      DeliveredAt: d.deliveredAt ?? '',
      SkippedAt: d.skippedAt ?? '',
      SkippedReason: d.skippedReason ?? '',
      DonationStatus: d.donation?.status ?? 'NotRecorded',
      DonationMethod: d.donation?.method ?? '',
      DonationAmount: d.donation?.amount ?? '',
      TotalDonation: totalsMap.get(d.baseRowId)?.donation.toFixed(2) ?? '0.00',
      TotalDozens: totalsMap.get(d.baseRowId)?.dozens ?? 0,
      TotalTaxableDonation: totalsMap.get(d.baseRowId)?.taxable.toFixed(2) ?? '0.00'
    }));
    return Papa.unparse(rows);
  }

  private toCsvWithImportState(
    deliveries: Delivery[],
    state: { headers: string[]; rowsByBaseRowId: Record<string, string[]> },
    totalsMap: Map<string, { donation: number; dozens: number; taxable: number }>
  ): string {
    const baseHeaders = [...state.headers];
    const baseRowIdIndex = baseHeaders.findIndex((h) => h.toLowerCase() === 'baserowid');
    const finalHeaders = [...baseHeaders];

    const runIds = Array.from(new Set(deliveries.map((d) => d.runId)));
    const runPrefixes = runIds.map((runId) => {
      const [runDate] = runId.split('_');
      return `Run_${runDate}`;
    });

    // Append missing run headers for each run
    runPrefixes.forEach((prefix) => {
      const cols = [
        `${prefix}_Status`,
        `${prefix}_DonationStatus`,
        `${prefix}_DonationMethod`,
        `${prefix}_DonationAmount`
      ];
      cols.forEach((c) => {
        if (!finalHeaders.includes(c)) {
          finalHeaders.push(c);
        }
      });
    });

    ['TotalDonation', 'TotalDozens', 'TotalDeductibleContribution'].forEach((col) => {
      if (!finalHeaders.includes(col)) {
        finalHeaders.push(col);
      }
    });

    const deliveryMap = new Map<string, Delivery>();
    deliveries.forEach((d) => deliveryMap.set(`${d.baseRowId}||${d.runId}`, d));

    const rows: string[][] = [];
    Object.entries(state.rowsByBaseRowId).forEach(([baseRowId, originalValues]) => {
      const rowVals = new Array<string>(finalHeaders.length).fill('');
      const paddedOriginal = [...originalValues];
      while (paddedOriginal.length < baseHeaders.length) paddedOriginal.push('');
      for (let i = 0; i < baseHeaders.length; i++) {
        rowVals[i] = paddedOriginal[i];
      }

      runIds.forEach((runId, idx) => {
        const prefix = runPrefixes[idx];
        const delivery = deliveryMap.get(`${baseRowId}||${runId}`);
        const status = delivery?.status ?? '';
        const donationStatus = delivery?.donation?.status ?? 'NotRecorded';
        const donationMethod = delivery?.donation?.method ?? '';
        const rawAmount = delivery?.donation?.amount;
        const donationAmount =
          rawAmount != null && !isNaN(Number(rawAmount)) ? Number(rawAmount).toFixed(2) : '';

        const cols = [
          `${prefix}_Status`,
          `${prefix}_DonationStatus`,
          `${prefix}_DonationMethod`,
          `${prefix}_DonationAmount`
        ];
        const vals = [status, donationStatus, donationMethod, donationAmount];
        cols.forEach((col, i) => {
          const idxHeader = finalHeaders.indexOf(col);
          if (idxHeader >= 0) {
            rowVals[idxHeader] = vals[i];
          }
        });
      });

      const totals = totalsMap.get(baseRowId);
      if (totals) {
      const donationIdx = finalHeaders.indexOf('TotalDonation');
      const dozensIdx = finalHeaders.indexOf('TotalDozens');
      const taxableIdx = finalHeaders.indexOf('TotalDeductibleContribution');
        if (donationIdx >= 0) rowVals[donationIdx] = totals.donation.toFixed(2);
        if (dozensIdx >= 0) rowVals[dozensIdx] = totals.dozens.toString();
        if (taxableIdx >= 0) rowVals[taxableIdx] = totals.taxable.toFixed(2);
      }

      rows.push(rowVals);
    });

    return Papa.unparse({ fields: finalHeaders, data: rows });
  }

  private toCsvWithImportStateAndHistory(
    deliveries: Delivery[],
    state: {
      headers: string[];
      rowsByBaseRowId: Record<string, string[]>;
      mode?: 'baseline' | 'restored';
    },
    totalsMap: Map<string, { donation: number; dozens: number; taxable: number }>,
    runs: {
      id: string;
      routeDate?: string;
      weekType?: string;
      status?: string;
      date?: string;
    }[],
    runEntries: {
      runId: string;
      baseRowId: string;
      deliveryOrder: number;
      status: string;
      dozens: number;
      donationStatus: string;
      donationMethod?: string;
      donationAmount: number;
      taxableAmount: number;
      name: string;
      address: string;
      city: string;
      state: string;
      zip?: string;
    }[]
  ): string {
    const baseHeaders = [...state.headers];
    const finalHeaders: string[] = ['RowType', ...baseHeaders];

    // Run-level metadata columns to support round-trip restore of history.
    const runMetaCols = [
      'RunId',
      'RouteDate',
      'ScheduleId',
      'RunStatus',
      'RunBaseRowId',
      'RunDeliveryOrder',
      'RunEntryStatus',
      'RunDozens',
      'RunDonationStatus',
      'RunDonationMethod',
      'RunDonationAmount',
      'RunTaxableAmount',
      // When the run was actually completed.
      'RunCompletedAt',
      // Event timestamp for this row (run entry or one-off).
      'EventDate'
    ];
    runMetaCols.forEach((c) => {
      if (!finalHeaders.includes(c)) {
        finalHeaders.push(c);
      }
    });

    // Optional per-event baseline column used primarily for one-off rows.
    if (!finalHeaders.includes('SuggestedAmount')) {
      finalHeaders.push('SuggestedAmount');
    }

    ['TotalDonation', 'TotalDozens', 'TotalDeductibleContribution'].forEach((col) => {
      if (!finalHeaders.includes(col)) {
        finalHeaders.push(col);
      }
    });

    const rows: string[][] = [];

    // 1) Delivery rows – one per baseRowId, using importState as baseline.
    Object.entries(state.rowsByBaseRowId).forEach(([baseRowId, originalValues]) => {
      const rowVals = new Array<string>(finalHeaders.length).fill('');
      rowVals[0] = 'Delivery';

      const paddedOriginal = [...originalValues];
      while (paddedOriginal.length < baseHeaders.length) paddedOriginal.push('');
      for (let i = 0; i < baseHeaders.length; i++) {
        const targetIndex = 1 + i;
        rowVals[targetIndex] = paddedOriginal[i];
      }

      const totals = totalsMap.get(baseRowId);
      if (totals) {
      const donationIdx = finalHeaders.indexOf('TotalDonation');
      const dozensIdx = finalHeaders.indexOf('TotalDozens');
      const taxableIdx = finalHeaders.indexOf('TotalDeductibleContribution');
        if (donationIdx >= 0) rowVals[donationIdx] = totals.donation.toFixed(2);
        if (dozensIdx >= 0) rowVals[dozensIdx] = totals.dozens.toString();
        if (taxableIdx >= 0) rowVals[taxableIdx] = totals.taxable.toFixed(2);
      }

      rows.push(rowVals);
    });

    // 2) RunEntry rows – one per historical run snapshot entry.
    const setVal = (rowVals: string[], col: string, value: string | number | undefined) => {
      const idx = finalHeaders.indexOf(col);
      if (idx >= 0) {
        rowVals[idx] = value != null ? String(value) : '';
      }
    };

    runEntries.forEach((entry) => {
      const rowVals = new Array<string>(finalHeaders.length).fill('');
      rowVals[0] = 'RunEntry';

      // Optionally denormalize some identity fields into the original columns.
      const nameIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'name');
      if (nameIdx >= 0) rowVals[1 + nameIdx] = entry.name;
      const addressIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'address');
      if (addressIdx >= 0) rowVals[1 + addressIdx] = entry.address;
      const cityIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'city');
      if (cityIdx >= 0) rowVals[1 + cityIdx] = entry.city;
      const stateIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'state');
      if (stateIdx >= 0) rowVals[1 + stateIdx] = entry.state;
      const zipIdx = baseHeaders.findIndex(
        (h) => h.toLowerCase() === 'zip' || h.toLowerCase() === 'zipcode'
      );
      if (zipIdx >= 0) rowVals[1 + zipIdx] = entry.zip ?? '';

      const run = runs.find((r) => r.id === entry.runId);
      setVal(rowVals, 'RunId', entry.runId);
      setVal(rowVals, 'RouteDate', run?.routeDate ?? '');
      setVal(rowVals, 'ScheduleId', run?.weekType ?? '');
      setVal(rowVals, 'RunStatus', run?.status ?? '');
      setVal(rowVals, 'RunBaseRowId', entry.baseRowId);
      setVal(rowVals, 'RunDeliveryOrder', entry.deliveryOrder);
      setVal(rowVals, 'RunEntryStatus', entry.status);
      setVal(rowVals, 'RunDozens', entry.dozens);
      setVal(rowVals, 'RunDonationStatus', entry.donationStatus);
      setVal(rowVals, 'RunDonationMethod', entry.donationMethod ?? '');
      setVal(rowVals, 'RunDonationAmount', entry.donationAmount);
      setVal(rowVals, 'RunTaxableAmount', entry.taxableAmount);

      // Prefer an explicit eventDate on the entry, then the run's completion
      // timestamp, then the run's routeDate. This keeps history stable
      // across backups/restores instead of defaulting to "now".
      const completedAt = run?.date ?? '';
      const eventDate = normalizeEventDate(
        entry.eventDate ??
          completedAt ??
          run?.routeDate
      ) ?? '';
      setVal(rowVals, 'RunCompletedAt', completedAt);
      setVal(rowVals, 'EventDate', eventDate);

      // Totals are per baseRowId, so we leave Total* columns blank here.
      rows.push(rowVals);
    });

    // 3) One-off rows – donation and delivery events not tied to a specific run.
    deliveries.forEach((d) => {
      const baseRowId = d.baseRowId;
      const name = d.name;
      const address = d.address;
      const city = d.city;
      const state = d.state;
      const zip = d.zip ?? '';

      // One-off donations
      (d.oneOffDonations ?? []).forEach((don) => {
        const rowVals = new Array<string>(finalHeaders.length).fill('');
        rowVals[0] = 'OneOffDonation';

        const nameIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'name');
        if (nameIdx >= 0) rowVals[1 + nameIdx] = name;
        const addressIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'address');
        if (addressIdx >= 0) rowVals[1 + addressIdx] = address;
        const cityIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'city');
        if (cityIdx >= 0) rowVals[1 + cityIdx] = city;
        const stateIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'state');
        if (stateIdx >= 0) rowVals[1 + stateIdx] = state;
        const zipIdx = baseHeaders.findIndex(
          (h) => h.toLowerCase() === 'zip' || h.toLowerCase() === 'zipcode'
        );
        if (zipIdx >= 0) rowVals[1 + zipIdx] = zip;

        const setVal = (col: string, value: string | number | undefined) => {
          const idx = finalHeaders.indexOf(col);
          if (idx >= 0) {
            rowVals[idx] = value != null ? String(value) : '';
          }
        };

        const suggested = Number(don.suggestedAmount ?? 0);
        const amount = Number(don.amount ?? suggested);
        const taxable =
          don.taxableAmount ?? Math.max(0, amount - suggested);

        setVal('RunBaseRowId', baseRowId);
        setVal('RunDozens', 0);
        setVal('RunDonationStatus', don.status);
        setVal('RunDonationMethod', don.method ?? '');
        setVal('RunDonationAmount', amount.toFixed(2));
        setVal('RunTaxableAmount', taxable.toFixed(2));
        setVal('SuggestedAmount', suggested ? suggested.toFixed(2) : '');
        // Persist the one-off event timestamp so restores do not
        // fall back to "now".
        setVal('EventDate', normalizeEventDate(don.date) ?? '');

        rows.push(rowVals);
      });

      // One-off deliveries
      (d.oneOffDeliveries ?? []).forEach((entry) => {
        const rowVals = new Array<string>(finalHeaders.length).fill('');
        rowVals[0] = 'OneOffDelivery';

        const nameIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'name');
        if (nameIdx >= 0) rowVals[1 + nameIdx] = name;
        const addressIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'address');
        if (addressIdx >= 0) rowVals[1 + addressIdx] = address;
        const cityIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'city');
        if (cityIdx >= 0) rowVals[1 + cityIdx] = city;
        const stateIdx = baseHeaders.findIndex((h) => h.toLowerCase() === 'state');
        if (stateIdx >= 0) rowVals[1 + stateIdx] = state;
        const zipIdx = baseHeaders.findIndex(
          (h) => h.toLowerCase() === 'zip' || h.toLowerCase() === 'zipcode'
        );
        if (zipIdx >= 0) rowVals[1 + zipIdx] = zip;

        const setVal = (col: string, value: string | number | undefined) => {
          const idx = finalHeaders.indexOf(col);
          if (idx >= 0) {
            rowVals[idx] = value != null ? String(value) : '';
          }
        };

        const deliveredDozens = Number(entry.deliveredDozens ?? 0);
        const don = entry.donation;
        const suggested = Number(don?.suggestedAmount ?? 0);
        const amount = Number(don?.amount ?? suggested);
        const taxable =
          don?.taxableAmount ?? Math.max(0, amount - suggested);

        setVal('RunBaseRowId', baseRowId);
        setVal('RunDozens', deliveredDozens);
        setVal('RunDonationStatus', don?.status ?? 'NotRecorded');
        setVal('RunDonationMethod', don?.method ?? '');
        setVal('RunDonationAmount', amount.toFixed(2));
        setVal('RunTaxableAmount', taxable.toFixed(2));
        setVal('SuggestedAmount', suggested ? suggested.toFixed(2) : '');
        setVal('EventDate', normalizeEventDate(entry.date) ?? '');

        rows.push(rowVals);
      });
    });

    return Papa.unparse({ fields: finalHeaders, data: rows });
  }

  /**
   * Compute per-customer totals using the global formula:
   *   totalDeductibleContribution = max(0, totalDonation - totalBaselineValue)
   *
   * The returned `taxable` field represents `totalDeductibleContribution`.
   */
  private computeTotalsByBase(
    deliveries: Delivery[],
    runEntries: RunSnapshotEntry[] = [],
    importState?: {
      headers: string[];
      rowsByBaseRowId: Record<string, string[]>;
      mode?: 'baseline' | 'restored';
    }
  ): Map<string, { donation: number; dozens: number; taxable: number }> {
    const receiptsMap = new Map<
      string,
      { donation: number; dozens: number; baseline: number }
    >();

    const addReceipt = (
      baseRowId: string,
      donation: number,
      dozens: number,
      baseline: number
    ) => {
      const existing =
        receiptsMap.get(baseRowId) ?? { donation: 0, dozens: 0, baseline: 0 };
      existing.donation += donation;
      existing.dozens += dozens;
      existing.baseline += baseline;
      receiptsMap.set(baseRowId, existing);
    };

    const suggestedRate = this.storage.getSuggestedRate();

    // 1) Completed runs from runEntries (historical receipts).
    runEntries.forEach((e) => {
      const baseId = e.baseRowId;
      if (!baseId) return;

      // Treat "donation" status as a pure donation receipt with no dozens/baseline.
      if (e.status === 'donation') {
        const amount =
          e.donationStatus === 'Donated' ? Number(e.donationAmount ?? 0) : 0;
        if (amount) {
          addReceipt(baseId, amount, 0, 0);
        }
        return;
      }

      // Delivered / skipped entries – only delivered stops contribute dozens.
      const dozens = e.status === 'delivered' ? Number(e.dozens ?? 0) : 0;
      const amount =
        e.donationStatus === 'Donated'
          ? Number(e.donationAmount ?? 0)
          : 0;

      // If we have a taxableAmount, we can recover a per-event baseline as:
      //   baseline_i = max(0, amount_i - taxable_i)
      // Otherwise fall back to dozens * current suggested rate.
      let baseline = 0;
      if (amount > 0 && Number.isFinite(e.taxableAmount)) {
        const recovered = amount - Number(e.taxableAmount ?? 0);
        baseline = recovered > 0 ? recovered : 0;
      } else if (dozens > 0) {
        baseline = dozens * suggestedRate;
      }

      if (amount || dozens || baseline) {
        addReceipt(baseId, amount, dozens, baseline);
      }
    });

    // 2) Current live deliveries and one-offs (receipts not yet snapshotted into runs).
    deliveries.forEach((d) => {
      const baseId = d.baseRowId;
      if (!baseId) return;

      // Main route-level donation/dozens (only when delivered).
      if (d.status === 'delivered') {
        const dozens = Number(
          d.deliveredDozens ?? d.dozens ?? 0
        );
        const donationInfo = d.donation;
        const amount =
          donationInfo?.status === 'Donated'
            ? Number(
                donationInfo.amount ??
                  donationInfo.suggestedAmount ??
                  dozens * suggestedRate
              )
            : 0;
        const baseline =
          dozens > 0
            ? Number(
                donationInfo?.suggestedAmount ?? dozens * suggestedRate
              )
            : 0;
        if (amount || dozens || baseline) {
          addReceipt(baseId, amount, dozens, baseline);
        }
      }

      // One-off donations: pure donation events, no dozens/baseline.
      (d.oneOffDonations ?? []).forEach((don) => {
        const amount = Number(
          don.amount ?? don.suggestedAmount ?? 0
        );
        if (!amount) return;
        addReceipt(baseId, amount, 0, 0);
      });

      // One-off deliveries: additional dozens plus optional donation.
      (d.oneOffDeliveries ?? []).forEach((entry) => {
        const dozens = Number(entry.deliveredDozens ?? 0);
        const donationInfo = entry.donation;
        const amount =
          donationInfo?.status === 'Donated'
            ? Number(
                donationInfo.amount ??
                  donationInfo.suggestedAmount ??
                  dozens * suggestedRate
              )
            : 0;
        const baseline =
          dozens > 0
            ? Number(
                donationInfo?.suggestedAmount ?? dozens * suggestedRate
              )
            : 0;
        if (amount || dozens || baseline) {
          addReceipt(baseId, amount, dozens, baseline);
        }
      });
    });

    // 3) Seed totals map from importState (baseline data from an imported CSV).
    // For restored backups we ignore importState totals and recompute from receipts only.
    const totalsMap = new Map<
      string,
      { donation: number; dozens: number; taxable: number }
    >();
    const baselineTotals = new Map<
      string,
      { donation: number; dozens: number; taxable: number }
    >();

    if (importState && importState.mode !== 'restored') {
      const { headers, rowsByBaseRowId } = importState;
      const donationIdx = headers.findIndex(
        (h) => h.toLowerCase() === 'totaldonation'
      );
      const dozensIdx = headers.findIndex(
        (h) => h.toLowerCase() === 'totaldozens'
      );
      const taxableIdx = headers.findIndex((h) => {
        const v = h.toLowerCase();
        return (
          v === 'totaltaxabledonation' ||
          v === 'totaldeductibledonation' ||
          v === 'totaldeductiblecontribution'
        );
      });

      Object.entries(rowsByBaseRowId).forEach(([baseRowId, values]) => {
        let donation = 0;
        let dozens = 0;
        let taxable = 0;
        if (donationIdx >= 0 && donationIdx < values.length) {
          donation = Number(values[donationIdx]) || 0;
        }
        if (dozensIdx >= 0 && dozensIdx < values.length) {
          dozens = Number(values[dozensIdx]) || 0;
        }
        if (taxableIdx >= 0 && taxableIdx < values.length) {
          taxable = Number(values[taxableIdx]) || 0;
        }
        if (donation || dozens || taxable) {
          baselineTotals.set(baseRowId, {
            donation,
            dozens,
            taxable
          });
        }
      });
    }

    // 4) Combine baseline totals (if any) with contributions from receipts.
    const allBaseRowIds = new Set<string>([
      ...baselineTotals.keys(),
      ...receiptsMap.keys()
    ]);

    allBaseRowIds.forEach((baseRowId) => {
      const baseline = baselineTotals.get(baseRowId) ?? {
        donation: 0,
        dozens: 0,
        taxable: 0
      };
      const receipts = receiptsMap.get(baseRowId) ?? {
        donation: 0,
        dozens: 0,
        baseline: 0
      };

      const donation = baseline.donation + receipts.donation;
      const dozens = baseline.dozens + receipts.dozens;
      // Baseline value from imported history plus newly recorded receipts.
      const baselineFromImport =
        baseline.donation > 0
          ? Math.max(0, baseline.donation - baseline.taxable)
          : 0;
      const baselineTotal = baselineFromImport + receipts.baseline;
      const deductibleFromReceipts = Math.max(
        0,
        receipts.donation - receipts.baseline
      );
      const taxable = baseline.taxable + deductibleFromReceipts;

      // Expose baselineTotal via an extra property so callers that know
      // about it can show "Baseline value" in the UI, while existing
      // callers that expect donation/dozens/taxable keep working.
      totalsMap.set(
        baseRowId,
        { donation, dozens, taxable, baseline: baselineTotal } as any
      );
    });

    return totalsMap;
  }
}
