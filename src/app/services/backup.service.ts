import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import { Delivery } from '../models/delivery.model';
import { CsvImportState } from '../models/csv-import-state.model';
import { DeliveryRun } from '../models/delivery-run.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';
import { StorageService } from './storage.service';
import { getEventYear, normalizeEventDate } from '../utils/date-utils';

interface ExportDiagnosticPayload {
  taxYear?: number;
  deliveries: Delivery[];
  importState: CsvImportState | null;
  runEntries: RunSnapshotEntry[];
  runs: DeliveryRun[];
  error: unknown;
  exportContext: ExportAttemptContext;
}

type ExportFailureStep =
  | 'load-deliveries'
  | 'load-import-state'
  | 'load-run-entries'
  | 'compute-totals'
  | 'load-runs'
  | 'build-csv'
  | 'create-file'
  | 'share-check'
  | 'share'
  | 'download'
  | 'persist-backup-timestamp'
  | 'diagnostic-export'
  | 'unknown';

interface ExportAttemptContext {
  shareSupported: boolean;
  canShareSupported: boolean;
  shareAttempted: boolean;
  shareSucceeded: boolean;
  downloadFallbackAttempted: boolean;
  downloadFallbackSucceeded: boolean;
  failedStep: ExportFailureStep | null;
  canShareError?: {
    name: string;
    message: string;
    stack?: string;
  };
  shareError?: {
    name: string;
    message: string;
    stack?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class BackupService {
  constructor(private storage: StorageService) {}

  async exportAll(taxYear?: number): Promise<void> {
    const exportTaxYear = this.resolveExportTaxYear(taxYear);
    const exportContext = this.createExportAttemptContext();
    let deliveries: Delivery[] = [];
    let importState: CsvImportState | null = null;
    let runEntries: RunSnapshotEntry[] = [];
    let runs: DeliveryRun[] = [];

    try {
      exportContext.failedStep = 'load-deliveries';
      deliveries = await this.storage.getAllDeliveries();
      exportContext.failedStep = 'load-import-state';
      importState = (await this.storage.getImportState('default')) ?? null;
      exportContext.failedStep = 'load-run-entries';
      runEntries = await this.storage.getAllRunEntries();
      exportContext.failedStep = 'compute-totals';
      const totalsMap = this.computeTotalsByBase(
        deliveries,
        runEntries,
        importState ?? undefined,
        exportTaxYear
      );
      exportContext.failedStep = 'load-runs';
      runs = await this.storage.getAllRuns();
      exportContext.failedStep = 'build-csv';
      const csv = importState
        ? this.toCsvWithImportStateAndHistory(
            deliveries,
            importState,
            totalsMap,
            runs,
            runEntries
          )
        : this.toCsv(deliveries, totalsMap);
      const filename = this.buildExportFilename(exportTaxYear);
      exportContext.failedStep = 'create-file';
      const file = new File([csv], filename, { type: 'text/csv' });

      await this.deliverFile(file, filename, exportContext);
      exportContext.failedStep = 'persist-backup-timestamp';
      this.persistLastBackupAt();
      exportContext.failedStep = null;
    } catch (error) {
      if (!exportContext.failedStep) {
        exportContext.failedStep = 'unknown';
      }
      const diagnosticFile = await this.tryExportDiagnosticSnapshot({
        taxYear: exportTaxYear,
        deliveries,
        importState,
        runEntries,
        runs,
        error,
        exportContext
      });
      const reason = this.normalizeSentence(this.errorMessage(error));
      const diagnosticHint = diagnosticFile
        ? ` Diagnostic snapshot was saved as ${diagnosticFile}.`
        : ' Diagnostic snapshot could not be generated.';
      throw new Error(`Export failed: ${reason}.${diagnosticHint}`);
    }
  }

  private toCsv(
    deliveries: Delivery[],
    totalsMap: Map<string, { donation: number; dozens: number; taxable: number }>
  ): string {
    const rows = deliveries.map((d) => {
      const totals = totalsMap.get(d.baseRowId ?? '');
      const donationTotal = totals?.donation ?? 0;
      const dozensTotal = totals?.dozens ?? 0;
      const taxableTotal = totals?.taxable ?? 0;
      return ({
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
      TotalDonation: donationTotal.toFixed(2),
      TotalDozens: dozensTotal,
      TotalTaxableDonation: taxableTotal.toFixed(2)
    });
    });
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
    runEntries: RunSnapshotEntry[]
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
        const taxable = amount > 0 ? amount : 0;

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
   * When `taxYear` is provided, receipts are filtered to that year.
   */
  private computeTotalsByBase(
    deliveries: Delivery[],
    runEntries: RunSnapshotEntry[] = [],
    importState?: {
      headers: string[];
      rowsByBaseRowId: Record<string, string[]>;
      mode?: 'baseline' | 'restored';
    },
    taxYear?: number
  ): Map<string, { donation: number; dozens: number; taxable: number }> {
    const now = new Date();
    const fallbackYear = now.getFullYear();
    const targetYear = typeof taxYear === 'number' ? taxYear : undefined;
    const includeEvent = (raw?: string | number | null): boolean => {
      if (targetYear == null) return true;
      return getEventYear(raw, now) === targetYear;
    };
    const includeRunEntry = (entry: RunSnapshotEntry): boolean => {
      if (targetYear == null) return true;
      const runIdDate = entry.runId?.split('_').pop();
      const eventSource = entry.eventDate ?? runIdDate;
      return getEventYear(eventSource, now) === targetYear;
    };
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
      if (!includeRunEntry(e)) return;

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
        if (!includeEvent(d.deliveredAt)) return;
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
        if (!includeEvent(don.date)) return;
        const amount = Number(
          don.amount ?? don.suggestedAmount ?? 0
        );
        if (!amount) return;
        addReceipt(baseId, amount, 0, 0);
      });

      // One-off deliveries: additional dozens plus optional donation.
      (d.oneOffDeliveries ?? []).forEach((entry) => {
        if (!includeEvent(entry.date)) return;
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
    const includeBaselineTotals =
      targetYear == null || targetYear === this.resolveBaselineYear(fallbackYear);

    if (importState && importState.mode !== 'restored' && includeBaselineTotals) {
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
    const deliveryBaseRowIds = deliveries
      .map((d) => d.baseRowId)
      .filter((baseRowId): baseRowId is string => !!baseRowId);
    const allBaseRowIds = new Set<string>([
      ...baselineTotals.keys(),
      ...receiptsMap.keys(),
      ...deliveryBaseRowIds
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

  private resolveBaselineYear(fallbackYear: number): number {
    if (typeof localStorage === 'undefined') return fallbackYear;
    const raw = localStorage.getItem('lastImportAt');
    if (!raw) return fallbackYear;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime())
      ? fallbackYear
      : parsed.getFullYear();
  }

  private resolveExportTaxYear(taxYear?: number): number | undefined {
    if (Number.isFinite(taxYear)) {
      return Math.trunc(taxYear as number);
    }
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem('selectedTaxYear');
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
  }

  private buildExportFilename(taxYear?: number): string {
    const datePart = new Date().toISOString().slice(0, 10);
    const yearSuffix =
      typeof taxYear === 'number' ? `-tax-year-${taxYear}` : '';
    return `BiruksEggDeliveries-${datePart}${yearSuffix}.csv`;
  }

  private buildDiagnosticFilename(taxYear?: number): string {
    const datePart = new Date().toISOString().slice(0, 10);
    const yearSuffix =
      typeof taxYear === 'number' ? `-tax-year-${taxYear}` : '';
    return `BiruksEggDeliveries-diagnostic-${datePart}${yearSuffix}.json`;
  }

  private async deliverFile(
    file: File,
    filename: string,
    context: ExportAttemptContext
  ): Promise<void> {
    if (this.canShareFiles(file, context)) {
      context.shareAttempted = true;
      try {
        context.failedStep = 'share';
        await navigator.share({
          files: [file],
          title: "Biruk's Egg Deliveries",
          text: 'Backup CSV'
        });
        context.shareSucceeded = true;
        context.failedStep = null;
        return;
      } catch (error) {
        context.shareError = this.describeError(error);
        console.warn('Share export failed, falling back to direct download.', error);
      }
    }
    context.downloadFallbackAttempted = true;
    context.failedStep = 'download';
    this.downloadFile(file, filename);
    context.downloadFallbackSucceeded = true;
    context.failedStep = null;
  }

  private canShareFiles(file: File, context: ExportAttemptContext): boolean {
    if (typeof navigator === 'undefined') return false;
    if (typeof navigator.share !== 'function') return false;
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    if (typeof nav.canShare !== 'function') return false;
    try {
      return nav.canShare({ files: [file] }) === true;
    } catch (error) {
      context.failedStep = 'share-check';
      context.canShareError = this.describeError(error);
      console.warn('navigator.canShare check failed; skipping share path.', error);
      return false;
    }
  }

  private downloadFile(file: File, filename: string): void {
    const url = URL.createObjectURL(file);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private persistLastBackupAt(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const now = new Date().toISOString();
      localStorage.setItem('lastBackupAt', now);
    } catch (error) {
      console.warn('Backup export succeeded but timestamp update failed.', error);
    }
  }

  private async tryExportDiagnosticSnapshot(
    payload: ExportDiagnosticPayload
  ): Promise<string | null> {
    try {
      const filename = this.buildDiagnosticFilename(payload.taxYear);
      const buildInfo = await this.readBuildInfoForDiagnostics();
      const snapshot = {
        diagnosticSchemaVersion: 2,
        exportedAt: new Date().toISOString(),
        app: {
          releaseVersion: buildInfo.releaseVersion,
          buildCommit: buildInfo.buildCommit,
          buildInfoSource: buildInfo.source,
          buildInfoError: buildInfo.error ?? null
        },
        runtime: this.collectRuntimeInfo(),
        exportContext: payload.exportContext,
        selectedTaxYear:
          typeof localStorage === 'undefined'
            ? null
            : localStorage.getItem('selectedTaxYear'),
        taxYear: payload.taxYear,
        error: this.describeError(payload.error),
        counts: {
          deliveries: payload.deliveries.length,
          runEntries: payload.runEntries.length,
          runs: payload.runs.length,
          importRows: Object.keys(payload.importState?.rowsByBaseRowId ?? {}).length
        },
        orderIntegritySummary: this.buildOrderIntegritySummary(payload.deliveries),
        data: {
          deliveries: payload.deliveries,
          importState: payload.importState,
          runEntries: payload.runEntries,
          runs: payload.runs
        }
      };
      const content = JSON.stringify(snapshot, null, 2);
      const file = new File([content], filename, { type: 'application/json' });
      this.downloadFile(file, filename);
      return filename;
    } catch (diagnosticError) {
      console.error('Failed to export diagnostic snapshot.', diagnosticError);
      return null;
    }
  }

  private describeError(error: unknown): {
    name: string;
    message: string;
    stack?: string;
  } {
    if (error instanceof Error) {
      return {
        name: error.name || 'Error',
        message: this.errorMessage(error),
        stack: error.stack
      };
    }
    return {
      name: 'UnknownError',
      message: this.errorMessage(error)
    };
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message?.trim();
      return message ? message : 'Unknown export error';
    }
    if (typeof error === 'string') {
      const message = error.trim();
      return message ? message : 'Unknown export error';
    }
    if (error == null) return 'Unknown export error';
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private normalizeSentence(text: string): string {
    return text.trim().replace(/[.?!]+$/g, '');
  }

  private createExportAttemptContext(): ExportAttemptContext {
    const nav = typeof navigator === 'undefined' ? null : navigator;
    const shareSupported = typeof nav?.share === 'function';
    const canShareSupported =
      shareSupported &&
      typeof (nav as Navigator & { canShare?: unknown })?.canShare === 'function';
    return {
      shareSupported,
      canShareSupported,
      shareAttempted: false,
      shareSucceeded: false,
      downloadFallbackAttempted: false,
      downloadFallbackSucceeded: false,
      failedStep: null
    };
  }

  private async readBuildInfoForDiagnostics(): Promise<{
    releaseVersion: string | null;
    buildCommit: string | null;
    source: string;
    error?: string;
  }> {
    if (typeof fetch !== 'function') {
      return {
        releaseVersion: null,
        buildCommit: null,
        source: 'unavailable',
        error: 'Fetch API unavailable.'
      };
    }
    const buildInfoUrl = this.resolveBuildInfoUrl();
    try {
      const response = await fetch(buildInfoUrl, { cache: 'no-store' });
      if (!response.ok) {
        return {
          releaseVersion: null,
          buildCommit: null,
          source: buildInfoUrl,
          error: `HTTP ${response.status}`
        };
      }
      const payload = (await response.json()) as {
        version?: unknown;
        commit?: unknown;
      };
      const releaseVersion =
        typeof payload.version === 'string' ? payload.version : null;
      const buildCommit =
        typeof payload.commit === 'string'
          ? payload.commit
          : payload.commit == null
            ? null
            : String(payload.commit);
      return {
        releaseVersion,
        buildCommit,
        source: buildInfoUrl
      };
    } catch (error) {
      return {
        releaseVersion: null,
        buildCommit: null,
        source: buildInfoUrl,
        error: this.errorMessage(error)
      };
    }
  }

  private collectRuntimeInfo(): {
    userAgent: string | null;
    platform: string | null;
    language: string | null;
    timezone: string | null;
    isStandalonePwa: boolean;
    serviceWorkerControllerPresent: boolean;
  } {
    const nav = typeof navigator === 'undefined' ? null : navigator;
    let timezone: string | null = null;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
      timezone = null;
    }
    return {
      userAgent: nav?.userAgent ?? null,
      platform: nav?.platform ?? null,
      language: nav?.language ?? null,
      timezone,
      isStandalonePwa: this.isStandalonePwa(),
      serviceWorkerControllerPresent: Boolean(nav?.serviceWorker?.controller)
    };
  }

  private isStandalonePwa(): boolean {
    let displayModeStandalone = false;
    try {
      displayModeStandalone =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches;
    } catch {
      displayModeStandalone = false;
    }
    const nav =
      typeof navigator === 'undefined'
        ? null
        : (navigator as Navigator & { standalone?: boolean });
    const iosStandalone = Boolean(nav?.standalone);
    return displayModeStandalone || iosStandalone;
  }

  private resolveBuildInfoUrl(): string {
    if (typeof document === 'undefined') {
      return 'build-info.json';
    }
    try {
      return new URL('build-info.json', document.baseURI).toString();
    } catch {
      return 'build-info.json';
    }
  }

  private buildOrderIntegritySummary(
    deliveries: Delivery[]
  ): Array<{
    routeDate: string;
    stopCount: number;
    minOrder: number | null;
    maxOrder: number | null;
    duplicateOrderValues: number[];
    duplicateOrderCount: number;
    gapCount: number;
    isDense: boolean;
    alphabeticalMatchRatio: number;
    likelyAlphabeticalOrder: boolean;
  }> {
    const byRoute = new Map<string, Delivery[]>();
    deliveries.forEach((delivery) => {
      const routeDate = delivery.routeDate || 'UNKNOWN_ROUTE';
      const list = byRoute.get(routeDate) ?? [];
      list.push(delivery);
      byRoute.set(routeDate, list);
    });

    return Array.from(byRoute.entries())
      .map(([routeDate, items]) => {
        const normalized = items.map((delivery, index) => ({
          delivery,
          order: this.resolveOrderValue(delivery, index)
        }));
        const orders = normalized.map((item) => item.order);
        const unique = new Set(orders);
        const duplicateOrderValues = Array.from(unique)
          .filter((value) => orders.filter((order) => order === value).length > 1)
          .sort((a, b) => a - b);
        const minOrder = orders.length ? Math.min(...orders) : null;
        const maxOrder = orders.length ? Math.max(...orders) : null;
        const expectedCount =
          minOrder == null || maxOrder == null ? 0 : maxOrder - minOrder + 1;
        const gapCount = expectedCount > 0 ? expectedCount - unique.size : 0;
        const isDense =
          minOrder != null &&
          minOrder === 0 &&
          maxOrder != null &&
          maxOrder === items.length - 1 &&
          duplicateOrderValues.length === 0;

        const byOrder = normalized
          .slice()
          .sort((a, b) => a.order - b.order);
        const byName = normalized
          .slice()
          .sort((a, b) => {
            const nameA = (a.delivery.name ?? '').toLocaleLowerCase();
            const nameB = (b.delivery.name ?? '').toLocaleLowerCase();
            const nameCmp = nameA.localeCompare(nameB);
            return nameCmp !== 0 ? nameCmp : a.order - b.order;
          });
        const exactRankMatches = byOrder.filter(
          (item, index) => byName[index]?.delivery.id === item.delivery.id
        ).length;
        const alphabeticalMatchRatio =
          items.length > 0 ? exactRankMatches / items.length : 0;

        return {
          routeDate,
          stopCount: items.length,
          minOrder,
          maxOrder,
          duplicateOrderValues,
          duplicateOrderCount: duplicateOrderValues.length,
          gapCount: gapCount > 0 ? gapCount : 0,
          isDense,
          alphabeticalMatchRatio,
          likelyAlphabeticalOrder: items.length > 0 && alphabeticalMatchRatio >= 0.9
        };
      })
      .sort((a, b) => a.routeDate.localeCompare(b.routeDate));
  }

  private resolveOrderValue(delivery: Delivery, fallback: number): number {
    const raw = delivery.deliveryOrder ?? delivery.sortIndex ?? fallback;
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
  }
}
