import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import { Delivery } from '../models/delivery.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class BackupService {
  constructor(private storage: StorageService) {}

  async exportAll(): Promise<void> {
    const deliveries = await this.storage.getAllDeliveries();
    const importState = await this.storage.getImportState('default');
    const runEntries = await this.storage.getAllRunEntries();
    const totalsMap = this.computeTotalsByBase(deliveries, runEntries, importState ?? undefined);
    const csv = importState
      ? this.toCsvWithImportState(deliveries, importState, totalsMap)
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

    ['TotalDonation', 'TotalDozens', 'TotalTaxableDonation'].forEach((col) => {
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
        const taxableIdx = finalHeaders.indexOf('TotalTaxableDonation');
        if (donationIdx >= 0) rowVals[donationIdx] = totals.donation.toFixed(2);
        if (dozensIdx >= 0) rowVals[dozensIdx] = totals.dozens.toString();
        if (taxableIdx >= 0) rowVals[taxableIdx] = totals.taxable.toFixed(2);
      }

      rows.push(rowVals);
    });

    return Papa.unparse({ fields: finalHeaders, data: rows });
  }

  private computeTotalsByBase(
    deliveries: Delivery[],
    runEntries: { baseRowId: string; donationAmount: number; dozens: number; taxableAmount: number }[],
    importState?: { headers: string[]; rowsByBaseRowId: Record<string, string[]> }
  ): Map<string, { donation: number; dozens: number; taxable: number }> {
    const map = new Map<string, { donation: number; dozens: number; taxable: number }>();
    const addTotals = (baseRowId: string, donation: number, dozens: number, taxable: number) => {
      const entry = map.get(baseRowId) ?? { donation: 0, dozens: 0, taxable: 0 };
      entry.donation += donation;
      entry.dozens += dozens;
      entry.taxable += taxable;
      map.set(baseRowId, entry);
    };

    // 1) Baseline from import state (if totals columns exist)
    if (importState) {
      const { headers, rowsByBaseRowId } = importState;
      const donationIdx = headers.findIndex(
        (h) => h.toLowerCase() === 'totaldonation'
      );
      const dozensIdx = headers.findIndex(
        (h) => h.toLowerCase() === 'totaldozens'
      );
      const taxableIdx = headers.findIndex(
        (h) => h.toLowerCase() === 'totaltaxabledonation'
      );

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
          addTotals(baseRowId, donation, dozens, taxable);
        }
      });
    }

    // 2) Completed runs from runEntries
    runEntries.forEach((e) => {
      addTotals(e.baseRowId, e.donationAmount, e.dozens, e.taxableAmount);
    });

    // 3) Current live deliveries and one-offs
    deliveries.forEach((d) => {
      const baseId = d.baseRowId;
      if (!baseId) return;

      // Main run donation/dozens (only when delivered)
      if (d.status === 'delivered') {
        const suggested = Number(d.donation?.suggestedAmount ?? 0);
        const donationAmt =
          d.donation?.status === 'Donated'
            ? Number(d.donation.amount ?? d.donation.suggestedAmount ?? 0)
            : 0;
        const taxableAmt =
          d.donation?.status === 'Donated'
            ? Number(
                d.donation.taxableAmount ??
                  Math.max(0, donationAmt - suggested)
              )
            : 0;
        const dozens = Number(d.deliveredDozens ?? d.dozens ?? 0);
        addTotals(baseId, donationAmt, dozens, taxableAmt);
      }

      // One-off donations
      (d.oneOffDonations ?? []).forEach((don) => {
        const suggested = Number(don.suggestedAmount ?? 0);
        const amt = Number(don.amount ?? don.suggestedAmount ?? 0);
        const taxableAmt =
          don.taxableAmount ?? Math.max(0, amt - suggested);
        addTotals(baseId, amt, 0, taxableAmt);
      });

      // One-off deliveries (dozens + donation)
      (d.oneOffDeliveries ?? []).forEach((entry) => {
        const suggested = Number(entry.donation?.suggestedAmount ?? 0);
        const amt = Number(entry.donation?.amount ?? entry.donation?.suggestedAmount ?? 0);
        const taxableAmt =
          entry.donation?.taxableAmount ??
          Math.max(0, amt - suggested);
        const dozens = Number(entry.deliveredDozens ?? 0);
        addTotals(baseId, amt, dozens, taxableAmt);
      });
    });

    return map;
  }
}
