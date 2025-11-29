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
    const csv = importState ? this.toCsvWithImportState(deliveries, importState) : this.toCsv(deliveries);
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

  private toCsv(deliveries: Delivery[]): string {
    const totalsMap = this.computeTotalsByBase(deliveries);
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
      TotalDozens: totalsMap.get(d.baseRowId)?.dozens ?? 0
    }));
    return Papa.unparse(rows);
  }

  private toCsvWithImportState(
    deliveries: Delivery[],
    state: { headers: string[]; rowsByBaseRowId: Record<string, string[]> }
  ): string {
    const totalsMap = this.computeTotalsByBase(deliveries);
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

    ['TotalDonation', 'TotalDozens'].forEach((col) => {
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
        if (donationIdx >= 0) rowVals[donationIdx] = totals.donation.toFixed(2);
        if (dozensIdx >= 0) rowVals[dozensIdx] = totals.dozens.toString();
      }

      rows.push(rowVals);
    });

    return Papa.unparse({ fields: finalHeaders, data: rows });
  }

  private computeTotalsByBase(deliveries: Delivery[]): Map<string, { donation: number; dozens: number }> {
    const map = new Map<string, { donation: number; dozens: number }>();
    const addTotals = (baseRowId: string, donation: number, dozens: number) => {
      const entry = map.get(baseRowId) ?? { donation: 0, dozens: 0 };
      entry.donation += donation;
      entry.dozens += dozens;
      map.set(baseRowId, entry);
    };

    deliveries.forEach((d) => {
      const baseId = d.baseRowId;
      if (!baseId) return;

      // Main run donation/dozens (only when delivered)
      if (d.status === 'delivered') {
        const donationAmt =
          d.donation?.status === 'Donated'
            ? Number(d.donation.amount ?? d.donation.suggestedAmount ?? 0)
            : 0;
        const dozens = Number(d.deliveredDozens ?? d.dozens ?? 0);
        addTotals(baseId, donationAmt, dozens);
      }

      // One-off donations
      (d.oneOffDonations ?? []).forEach((don) => {
        const amt = Number(don.amount ?? don.suggestedAmount ?? 0);
        addTotals(baseId, amt, 0);
      });

      // One-off deliveries (dozens + donation)
      (d.oneOffDeliveries ?? []).forEach((entry) => {
        const amt = Number(entry.donation?.amount ?? entry.donation?.suggestedAmount ?? 0);
        const dozens = Number(entry.deliveredDozens ?? 0);
        addTotals(baseId, amt, dozens);
      });
    });

    return map;
  }
}
