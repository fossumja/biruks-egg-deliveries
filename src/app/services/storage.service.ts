import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import {
  Delivery,
  DeliveryStatus,
  DonationInfo,
  DonationMethod,
  DonationStatus
} from '../models/delivery.model';
import { Route } from '../models/route.model';
import { DeliveryRun } from '../models/delivery-run.model';
import { BaseStop } from '../models/base-stop.model';
import { CsvImportState } from '../models/csv-import-state.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';
import { ReceiptHistoryEntry } from '../models/receipt-history-entry.model';
import { getEventYear, normalizeEventDate, toSortableTimestamp } from '../utils/date-utils';

const SUGGESTED_KEY = 'suggestedDonationRate';

function getSuggestedRate(): number {
  if (typeof localStorage === 'undefined') return 4;
  const raw = localStorage.getItem(SUGGESTED_KEY);
  const num = raw != null ? Number(raw) : NaN;
  return Number.isFinite(num) && num > 0 ? num : 4;
}

function defaultDonation(d?: Delivery): DonationInfo {
  return {
    status: 'NotRecorded',
    suggestedAmount: (d?.dozens ?? 0) * getSuggestedRate(),
    taxableAmount: 0
  };
}

function computeTaxableAmount(d: DonationInfo): number {
  const suggested = Number(d.suggestedAmount ?? 0);
  const amount = Number(d.amount ?? suggested);
  const extra = amount - suggested;
  return extra > 0 ? extra : 0;
}

function computeOneOffDonationTaxableAmount(d: DonationInfo): number {
  if (d.status !== 'Donated') return 0;
  const amount = Number(d.amount ?? d.suggestedAmount ?? 0);
  return amount > 0 ? amount : 0;
}

class AppDB extends Dexie {
  deliveries!: Table<Delivery, string>;
  routes!: Table<Route, string>;
  runs!: Table<DeliveryRun, string>;
  baseStops!: Table<BaseStop, string>;
  importStates!: Table<CsvImportState, string>;
  runEntries!: Table<RunSnapshotEntry, string>;

  constructor() {
    super('BiruksEggDeliveriesDB');
    this.version(1).stores({
      deliveries: 'id, routeDate, status, sortIndex',
      routes: 'routeDate'
    });
    this.version(2)
      .stores({
        deliveries: 'id, routeDate, status, sortIndex',
        routes: 'routeDate'
      })
      .upgrade(async (tx) => {
        const all = await tx.table('deliveries').toArray();
        for (const d of all) {
          if (!d.donation) {
            d.donation = defaultDonation(d as Delivery);
          }
        }
        await tx.table('deliveries').bulkPut(all);
      });
    this.version(3)
      .stores({
        deliveries: 'id, runId, baseRowId, routeDate, status, sortIndex',
        routes: 'routeDate',
        runs: 'id',
        baseStops: 'baseRowId',
        importStates: 'id'
      })
      .upgrade(async (tx) => {
        const deliveries = await tx.table('deliveries').toArray();
        for (const d of deliveries) {
          if (!(d as Delivery).runId) {
            (d as Delivery).runId = (d as Delivery).routeDate || 'default-run';
          }
          if (!(d as Delivery).baseRowId) {
            (d as Delivery).baseRowId = (d as Delivery).id;
          }
        }
        await tx.table('deliveries').bulkPut(deliveries);
      });
    this.version(4).stores({
      deliveries: 'id, runId, baseRowId, routeDate, status, sortIndex',
      routes: 'routeDate',
      runs: 'id, weekType, routeDate',
      baseStops: 'baseRowId',
      importStates: 'id',
      runEntries: 'id, runId, baseRowId'
    });
  }
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private db: AppDB;

  constructor() {
    this.db = new AppDB();
    void this.requestPersistence();
  }

  getSuggestedRate(): number {
    return getSuggestedRate();
  }

  setSuggestedRate(value: number): void {
    if (typeof localStorage === 'undefined') return;
    const safe = Number.isFinite(value) && value > 0 ? value : 4;
    localStorage.setItem(SUGGESTED_KEY, safe.toString());
  }

  async importDeliveries(deliveries: Delivery[]): Promise<void> {
    const now = new Date().toISOString();
    const rate = this.getSuggestedRate();
    const normalized = deliveries.map((d) => {
      const baseDonation =
        d.donation ?? defaultDonation({ ...(d as Delivery), dozens: d.dozens, donation: undefined });
      if (baseDonation.taxableAmount == null) {
        baseDonation.taxableAmount = computeTaxableAmount(baseDonation);
      }
      const baseOriginalDonation =
        d.originalDonation ??
        d.donation ??
        ({
          status: 'NotRecorded' as const,
          suggestedAmount: (d.dozens ?? 0) * rate,
          taxableAmount: 0
        } as DonationInfo);
      if (baseOriginalDonation.taxableAmount == null) {
        baseOriginalDonation.taxableAmount = computeTaxableAmount(baseOriginalDonation);
      }

      return {
        ...d,
        runId: d.runId ?? d.routeDate ?? 'default-run',
        baseRowId: d.baseRowId ?? d.id,
        originalDozens: d.originalDozens ?? d.dozens,
        donation: { ...baseDonation },
        originalDonation: { ...baseOriginalDonation },
        subscribed: d.subscribed ?? true
      };
    });
    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      await this.db.deliveries.clear();
      await this.db.routes.clear();
      await this.db.deliveries.bulkAdd(normalized);

      const dates = Array.from(new Set(normalized.map((d) => d.routeDate)));
      for (const routeDate of dates) {
        const routeDeliveries = normalized.filter((d) => d.routeDate === routeDate);
        const totalStops = routeDeliveries.length;
        const deliveredCount = routeDeliveries.filter((d) => d.status === 'delivered').length;
        const skippedCount = routeDeliveries.filter((d) => d.status === 'skipped').length;
        await this.db.routes.put({
          routeDate,
          totalStops,
          deliveredCount,
          skippedCount,
          createdAt: now,
          lastUpdatedAt: now,
          completed: deliveredCount + skippedCount === totalStops
        });
      }
    });
  }

  getRoutes(): Promise<Route[]> {
    return this.db.routes.toArray().then((routes) =>
      routes.sort((a, b) => a.routeDate.localeCompare(b.routeDate))
    );
  }

  getAllDeliveries(): Promise<Delivery[]> {
    return this.db.deliveries.toArray();
  }

  getDeliveryById(id: string): Promise<Delivery | undefined> {
    return this.db.deliveries.get(id);
  }

  getDeliveriesByRoute(routeDate: string): Promise<Delivery[]> {
    return this.db.deliveries.where('routeDate').equals(routeDate).sortBy('sortIndex');
  }

  getDeliveriesByRun(runId: string): Promise<Delivery[]> {
    return this.db.deliveries.where('runId').equals(runId).sortBy('sortIndex');
  }

  async getRunsForSchedule(scheduleId: string): Promise<DeliveryRun[]> {
    return this.db.runs
      .where('weekType')
      .equals(scheduleId)
      .toArray()
      .then((runs) => runs.sort((a, b) => a.date.localeCompare(b.date)));
  }

  async getAllRuns(): Promise<DeliveryRun[]> {
    const runs = await this.db.runs.toArray();
    return runs.sort((a, b) => a.date.localeCompare(b.date));
  }

  getRunEntries(runId: string): Promise<RunSnapshotEntry[]> {
    return this.db.runEntries.where('runId').equals(runId).toArray();
  }

  getAllRunEntries(): Promise<RunSnapshotEntry[]> {
    return this.db.runEntries.toArray();
  }

  async getReceiptHistoryByBaseRowId(
    baseRowId: string,
    taxYear?: number
  ): Promise<ReceiptHistoryEntry[]> {
    if (!baseRowId) return [];
    const [runEntries, deliveries] = await Promise.all([
      this.db.runEntries.where('baseRowId').equals(baseRowId).toArray(),
      this.db.deliveries.where('baseRowId').equals(baseRowId).toArray()
    ]);

    if (!runEntries.length && !deliveries.length) return [];

    const runIds = Array.from(new Set(runEntries.map((entry) => entry.runId)));
    const runs = runIds.length
      ? await this.db.runs.where('id').anyOf(runIds).toArray()
      : [];
    const runDateById = new Map<string, string>();
    runs.forEach((run) => {
      if (run.id && run.date) {
        runDateById.set(run.id, run.date);
      }
    });

    const receipts: ReceiptHistoryEntry[] = [];

    runEntries.forEach((entry) => {
      const date =
        normalizeEventDate(entry.eventDate ?? runDateById.get(entry.runId)) ?? '';
      receipts.push({
        kind: 'run',
        date,
        status: entry.status,
        dozens: entry.dozens,
        donationStatus: entry.donationStatus,
        donationMethod: entry.donationMethod,
        donationAmount: entry.donationAmount,
        taxableAmount: entry.taxableAmount,
        runEntryId: entry.id,
        runId: entry.runId
      });
    });

    deliveries.forEach((delivery) => {
      (delivery.oneOffDonations ?? []).forEach((donation, index) => {
        const date = normalizeEventDate(donation.date) ?? '';
        const amount =
          donation.status === 'Donated'
            ? Number(donation.amount ?? donation.suggestedAmount ?? 0)
            : 0;
        const taxable =
          donation.taxableAmount ??
          computeOneOffDonationTaxableAmount(donation);
        receipts.push({
          kind: 'oneOffDonation',
          date,
          status: 'donation',
          dozens: 0,
          donationStatus: donation.status,
          donationMethod: donation.method,
          donationAmount: amount,
          taxableAmount: taxable,
          deliveryId: delivery.id,
          oneOffKind: 'donation',
          oneOffIndex: index
        });
      });

      (delivery.oneOffDeliveries ?? []).forEach((entry, index) => {
        const date = normalizeEventDate(entry.date) ?? '';
        const deliveredDozens = Number(entry.deliveredDozens ?? 0);
        const donation = entry.donation;
        const amount =
          donation?.status === 'Donated'
            ? Number(donation.amount ?? donation.suggestedAmount ?? 0)
            : 0;
        const taxable =
          donation?.taxableAmount ??
          (donation ? computeTaxableAmount(donation) : 0);
        receipts.push({
          kind: 'oneOffDelivery',
          date,
          status: 'delivered',
          dozens: deliveredDozens,
          donationStatus: (donation?.status ?? 'NotRecorded') as DonationStatus,
          donationMethod: donation?.method,
          donationAmount: amount,
          taxableAmount: taxable,
          deliveryId: delivery.id,
          oneOffKind: 'delivery',
          oneOffIndex: index
        });
      });
    });

    const now = new Date();
    const targetYear = Number.isFinite(taxYear) ? Math.trunc(taxYear as number) : undefined;
    const filtered = targetYear == null
      ? receipts
      : receipts.filter((receipt) => getEventYear(receipt.date, now) === targetYear);

    const sorted = filtered
      .map((receipt, index) => ({
        receipt,
        sortKey: toSortableTimestamp(receipt.date),
        order: index
      }))
      .sort((a, b) => {
        const delta = b.sortKey - a.sortKey;
        if (delta !== 0) return delta;
        return a.order - b.order;
      })
      .map((item) => item.receipt);

    return sorted;
  }

  async updateRunEntry(
    id: string,
    patch: Partial<RunSnapshotEntry>
  ): Promise<void> {
    await this.db.runEntries.update(id, patch);
  }

  async saveRunEntryOrdering(
    runId: string,
    entries: RunSnapshotEntry[]
  ): Promise<void> {
    const ordered = entries
      .slice()
      .sort(
        (a, b) =>
          (a.deliveryOrder ?? 0) - (b.deliveryOrder ?? 0)
      );
    await this.db.runEntries.bulkPut(ordered);
  }

  async deleteRunEntry(id: string): Promise<void> {
    if (!id) return;
    const entry = await this.db.runEntries.get(id);
    if (!entry) return;
    await this.db.runEntries.delete(id);
    if (!entry.runId) return;
    await this.reindexRunEntries(entry.runId);
  }

  async deleteOneOffDonationByIndex(
    deliveryId: string,
    index: number
  ): Promise<void> {
    const now = new Date().toISOString();
    const delivery = await this.db.deliveries.get(deliveryId);
    if (!delivery || !Array.isArray((delivery as Delivery).oneOffDonations)) return;
    const list = [...((delivery as Delivery).oneOffDonations ?? [])];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    await this.db.deliveries.update(deliveryId, {
      oneOffDonations: list,
      updatedAt: now,
      synced: false
    });
  }

  async deleteOneOffDeliveryByIndex(
    deliveryId: string,
    index: number
  ): Promise<void> {
    const now = new Date().toISOString();
    const delivery = await this.db.deliveries.get(deliveryId);
    if (!delivery || !Array.isArray((delivery as Delivery).oneOffDeliveries)) return;
    const list = [...((delivery as Delivery).oneOffDeliveries ?? [])];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    await this.db.deliveries.update(deliveryId, {
      oneOffDeliveries: list,
      updatedAt: now,
      synced: false
    });
  }

  private async reindexRunEntries(runId: string): Promise<void> {
    const entries = await this.db.runEntries
      .where('runId')
      .equals(runId)
      .toArray();
    if (!entries.length) return;
    const ordered = entries
      .slice()
      .sort(
        (a, b) =>
          (a.deliveryOrder ?? 0) - (b.deliveryOrder ?? 0)
      );
    ordered.forEach((entry, index) => {
      entry.deliveryOrder = index;
    });
    await this.db.runEntries.bulkPut(ordered);
  }

  async updateOneOffDonationByIndex(
    deliveryId: string,
    index: number,
    patch: {
      donationStatus: DonationStatus;
      donationMethod?: DonationMethod;
      donationAmount: number;
      suggestedAmount?: number;
      date?: string;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const delivery = await this.db.deliveries.get(deliveryId);
    if (!delivery || !Array.isArray((delivery as Delivery).oneOffDonations)) return;
    const list = [...((delivery as Delivery).oneOffDonations ?? [])];
    if (index < 0 || index >= list.length) return;
    const existing = { ...list[index] } as DonationInfo;

    const next: DonationInfo = {
      ...existing,
      status: patch.donationStatus,
      method: patch.donationStatus === 'Donated' ? patch.donationMethod : undefined,
      amount:
        patch.donationStatus === 'Donated'
          ? patch.donationAmount
          : patch.donationStatus === 'NoDonation'
            ? 0
            : undefined,
      taxableAmount: undefined
    };
    if (patch.suggestedAmount != null) {
      next.suggestedAmount = patch.suggestedAmount;
    }
    if (patch.date != null) {
      next.date = normalizeEventDate(patch.date) ?? existing.date ?? now;
    }
    next.taxableAmount = computeOneOffDonationTaxableAmount(next);
    list[index] = next;
    await this.db.deliveries.update(deliveryId, {
      oneOffDonations: list,
      updatedAt: now,
      synced: false
    });
  }

  async updateOneOffDeliveryByIndex(
    deliveryId: string,
    index: number,
    patch: {
      dozens: number;
      donationStatus: DonationStatus;
      donationMethod?: DonationMethod;
      donationAmount: number;
      suggestedAmount?: number;
      date?: string;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const delivery = await this.db.deliveries.get(deliveryId);
    if (!delivery || !Array.isArray((delivery as Delivery).oneOffDeliveries)) return;
    const list = [...((delivery as Delivery).oneOffDeliveries ?? [])];
    if (index < 0 || index >= list.length) return;
    const existing = { ...list[index] };
    const dozens = Math.max(0, Number(patch.dozens) || 0);
    const rate = this.getSuggestedRate();

    let donation: DonationInfo | undefined = existing.donation
      ? { ...(existing.donation as DonationInfo) }
      : undefined;

    if (patch.donationStatus === 'NotRecorded') {
      donation = undefined;
    } else {
      if (!donation) {
        donation = {
          status: 'Donated',
          suggestedAmount: dozens * rate
        };
      }
      donation.status = patch.donationStatus;
      donation.method =
        patch.donationStatus === 'Donated' ? patch.donationMethod : undefined;
      donation.amount =
        patch.donationStatus === 'Donated'
          ? patch.donationAmount
          : patch.donationStatus === 'NoDonation'
            ? 0
            : undefined;
      donation.suggestedAmount =
        patch.suggestedAmount != null ? patch.suggestedAmount : dozens * rate;
      donation.taxableAmount = computeTaxableAmount(donation);
    }

    const normalizedDate =
      patch.date != null ? normalizeEventDate(patch.date) ?? existing.date ?? now : existing.date ?? now;
    if (donation) {
      donation.date = normalizedDate;
    }
    list[index] = {
      ...existing,
      deliveredDozens: dozens,
      donation,
      date: normalizedDate
    };

    await this.db.deliveries.update(deliveryId, {
      oneOffDeliveries: list,
      updatedAt: now,
      synced: false
    });
  }

  async markDelivered(id: string, deliveredDozens?: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      const delivery = await this.db.deliveries.get(id);
      if (!delivery) return;

      const donation = delivery.donation ?? defaultDonation(delivery as Delivery);
      donation.date = now;

      await this.db.deliveries.update(id, {
        status: 'delivered',
        deliveredDozens: deliveredDozens ?? delivery.deliveredDozens ?? delivery.dozens,
        deliveredAt: now,
        skippedAt: undefined,
        skippedReason: undefined,
        donation,
        updatedAt: now,
        synced: false
      });

      await this.refreshRouteStats(delivery.routeDate, now);
    });
  }

  async markSkipped(id: string, reason?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      const delivery = await this.db.deliveries.get(id);
      if (!delivery) return;

      await this.db.deliveries.update(id, {
        status: 'skipped',
        skippedAt: now,
        skippedReason: reason,
        deliveredAt: undefined,
        donation: delivery.donation ?? defaultDonation(delivery as Delivery),
        updatedAt: now,
        synced: false
      });

      await this.refreshRouteStats(delivery.routeDate, now);
    });
  }

  async saveSortOrder(deliveries: Delivery[]): Promise<void> {
    const now = new Date().toISOString();
    const updated = deliveries.map((d, idx) => ({
      ...d,
      sortIndex: idx,
      deliveryOrder: idx,
      donation: d.donation ?? defaultDonation(d),
      updatedAt: now
    }));
    await this.db.deliveries.bulkPut(updated);
  }

  async completeRun(routeDate: string, endedEarly: boolean): Promise<void> {
    const now = new Date().toISOString();
    // Snapshot history first, then reset live route state.
    await this.db.transaction(
      'rw',
      this.db.deliveries,
      this.db.routes,
      this.db.runs,
      this.db.runEntries,
      async () => {
        const deliveries = await this.db.deliveries
          .where('routeDate')
          .equals(routeDate)
          .toArray();
        if (!deliveries.length) {
          return;
        }

        const pending = deliveries.filter(
          (d) => d.status === '' || d.status === 'changed'
        );
        if (pending.length) {
          throw new Error('Cannot complete run: some stops are still pending.');
        }

        const first = deliveries[0] as Delivery;
        const scheduleId =
          first.week || first.routeDate.replace(/\s+/g, '') || 'Schedule';
        const runId = `${routeDate}_${now}`;

        const snapshot: DeliveryRun = {
          id: runId,
          date: now,
          weekType: scheduleId,
          label: `${routeDate} – ${now.slice(0, 10)}`,
          status: endedEarly ? 'endedEarly' : 'completed',
          routeDate
        };
        await this.db.runs.put(snapshot);

        const entries: RunSnapshotEntry[] = [];
        for (const raw of deliveries) {
          const d = raw as Delivery;
          if (d.status !== 'delivered' && d.status !== 'skipped') continue;

          const deliveredDozens = Number(d.deliveredDozens ?? d.dozens ?? 0);
          const dozens =
            d.status === 'delivered' ? deliveredDozens : 0;
          const deliveryOrder = Number(
            d.deliveryOrder ?? d.sortIndex ?? 0
          );
          const donation =
            (d.donation as DonationInfo | undefined) ??
            defaultDonation(d as Delivery);
          const suggested =
            donation.suggestedAmount ??
            dozens * getSuggestedRate();
          const donationAmount =
            donation.status === 'Donated'
              ? Number(
                  donation.amount ??
                    donation.suggestedAmount ??
                    suggested
                )
              : 0;
          const taxableAmount =
            donation.status === 'Donated'
              ? computeTaxableAmount({
                  ...donation,
                  amount: donationAmount,
                  suggestedAmount: suggested
                })
              : 0;

          entries.push({
            id: typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${runId}_${d.baseRowId}`,
            runId,
            baseRowId: d.baseRowId,
            name: d.name,
            address: d.address,
            city: d.city,
            state: d.state,
            zip: d.zip,
            status: d.status as 'delivered' | 'skipped',
            dozens,
            deliveryOrder,
            donationStatus: donation.status,
            donationMethod: donation.method,
            donationAmount,
            taxableAmount
          });
        }

        if (entries.length) {
          await this.db.runEntries.bulkAdd(entries);
        }
      }
    );

    // Reset live route state outside the snapshot transaction.
    await this.resetRoute(routeDate);
  }

  async resetDelivery(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      const delivery = await this.db.deliveries.get(id);
      if (!delivery) return;
      const restoredDozens = delivery.originalDozens ?? delivery.dozens;
      const baselineDonation = defaultDonation({ ...(delivery as Delivery), dozens: restoredDozens });
      await this.db.deliveries.update(id, {
        status:
          delivery.subscribed === false ||
          (delivery.skippedReason?.toLowerCase?.().includes('unsubscribed') ?? false)
            ? ('skipped' as DeliveryStatus)
            : ('' as DeliveryStatus),
        dozens: restoredDozens,
        deliveredAt: undefined,
        skippedAt:
          delivery.subscribed === false ||
          (delivery.skippedReason?.toLowerCase?.().includes('unsubscribed') ?? false)
            ? delivery.skippedAt ?? now
            : undefined,
        skippedReason:
          delivery.subscribed === false ||
          (delivery.skippedReason?.toLowerCase?.().includes('unsubscribed') ?? false)
            ? delivery.skippedReason ?? 'Unsubscribed'
            : undefined,
        deliveredDozens: undefined,
        donation: baselineDonation,
        originalDonation: baselineDonation,
        updatedAt: now,
        synced: false,
        subscribed: delivery.subscribed ?? true
      });
      await this.refreshRouteStats(delivery.routeDate, now);
    });
  }

  async resetRoute(routeDate: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      const deliveries = await this.db.deliveries.where('routeDate').equals(routeDate).toArray();
      const reset: Delivery[] = deliveries.map((d) => ({
        ...d,
        status:
          d.subscribed === false ||
          (d.skippedReason?.toLowerCase?.().includes('unsubscribed') ?? false)
            ? ('skipped' as DeliveryStatus)
            : ('' as DeliveryStatus),
        dozens: d.originalDozens ?? d.dozens,
        deliveredDozens: undefined,
        deliveredAt: undefined,
        skippedAt:
          d.subscribed === false ||
          (d.skippedReason?.toLowerCase?.().includes('unsubscribed') ?? false)
            ? d.skippedAt ?? now
            : undefined,
        skippedReason:
          d.subscribed === false ||
          (d.skippedReason?.toLowerCase?.().includes('unsubscribed') ?? false)
            ? d.skippedReason ?? 'Unsubscribed'
            : undefined,
        donation: defaultDonation({ ...(d as Delivery), dozens: d.originalDozens ?? d.dozens }),
        originalDonation: defaultDonation({ ...(d as Delivery), dozens: d.originalDozens ?? d.dozens }),
        updatedAt: now,
        synced: false
      }));
      await this.db.deliveries.bulkPut(reset);
      await this.refreshRouteStats(routeDate, now);
    });
  }

  async addDelivery(routeDate: string, payload: Partial<Delivery>): Promise<Delivery> {
    const now = new Date().toISOString();
    // Pull current list to support insertion at a specific order.
    const list = await this.db.deliveries.where('routeDate').equals(routeDate).sortBy('sortIndex');

    // Derive schedule identifier from existing deliveries' routeDate (first column) to avoid separate week column.
    const existingDeliveries = list.slice(0, 1);
    const scheduleId =
      (payload.week ?? existingDeliveries[0]?.routeDate ?? routeDate ?? 'Schedule')
        .toString()
        .replace(/\s+/g, '') || 'Schedule';

    const baseRowId = payload.baseRowId ?? `NEW_${crypto.randomUUID?.() ?? Date.now()}`;
    const id = payload.id ?? crypto.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
    const dozens = payload.dozens ?? 0;
    const baseDonation: DonationInfo = { ...(payload.donation ?? defaultDonation({ ...(payload as Delivery), dozens })) };

    const newDelivery: Delivery = {
      id,
      runId: payload.runId ?? routeDate,
      baseRowId,
      routeDate,
      week: scheduleId,
      name: payload.name ?? '',
      address: payload.address ?? '',
      city: payload.city ?? '',
      state: payload.state ?? '',
      zip: payload.zip,
      dozens,
      originalDozens: payload.originalDozens ?? dozens,
      deliveryOrder: 0, // temporary, will reindex
      sortIndex: 0,     // temporary, will reindex
      notes: payload.notes,
      status: payload.status ?? '',
      donation: { ...baseDonation },
      originalDonation: { ...baseDonation },
      subscribed: payload.subscribed ?? true,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    // Determine insertion point (1-based from UI, clamp to list length + 1).
    const requestedOrder = Math.min(
      Math.max(1, (payload.deliveryOrder as number | undefined) ?? list.length + 1),
      list.length + 1
    );
    const insertIdx = requestedOrder - 1;
    list.splice(insertIdx, 0, newDelivery);

    // Reindex dense order/sort.
    list.forEach((d, idx) => {
      d.sortIndex = idx;
      d.deliveryOrder = idx;
      d.updatedAt = now;
    });

    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      await this.db.deliveries.bulkPut(list);
      await this.refreshRouteStats(routeDate, now);
    });

    return newDelivery;
  }

  async updatePlannedDozens(id: string, dozens: number): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    const originalDozens = existing?.originalDozens ?? existing?.dozens ?? dozens;
    const donation =
      ((existing?.donation as DonationInfo | undefined) ?? defaultDonation(existing as Delivery));
    donation.suggestedAmount = dozens * this.getSuggestedRate();
    const status = existing
      ? this.computeChangeStatus(existing as Delivery, { dozens }, donation)
      : ('changed' as DeliveryStatus);
    await this.db.deliveries.update(id, {
      dozens,
      originalDozens,
      status,
      deliveredDozens: undefined,
      donation,
      updatedAt: now,
      synced: false
    });
  }

  async updateDeliveredDozens(id: string, deliveredDozens: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db.deliveries.update(id, { deliveredDozens, updatedAt: now, synced: false });
  }

  async updateDraftDelivered(id: string, deliveredDozens: number): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    const donation = (existing?.donation as DonationInfo | undefined) ?? defaultDonation(existing as Delivery);
    donation.suggestedAmount = deliveredDozens * this.getSuggestedRate();
    const status = existing
      ? this.computeChangeStatus(existing as Delivery, { dozens: deliveredDozens, deliveredDozens }, donation)
      : ('changed' as DeliveryStatus);
    await this.db.deliveries.update(id, {
      deliveredDozens,
      dozens: deliveredDozens,
      status,
      donation,
      updatedAt: now,
      synced: false
    });
  }

  async updateDonation(id: string, donation: DonationInfo): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    const status = existing
      ? this.computeChangeStatus(existing as Delivery, undefined, donation)
      : ('changed' as DeliveryStatus);
    donation.taxableAmount = computeTaxableAmount(donation);
    await this.db.deliveries.update(id, { donation, status, updatedAt: now, synced: false });
  }

  async updateDonationPreserveStatus(id: string, donation: DonationInfo): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    if (!existing) return;
    donation.taxableAmount = computeTaxableAmount(donation);
    await this.db.deliveries.update(id, {
      donation,
      status: existing.status,
      updatedAt: now,
      synced: false
    });
  }

  async appendOneOffDonation(id: string, donation: DonationInfo): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    if (!existing) return;
    const list = Array.isArray(existing.oneOffDonations)
      ? [...existing.oneOffDonations]
      : [];
    const normalizedDate = normalizeEventDate(donation.date) ?? now;
    const normalizedDonation: DonationInfo = {
      ...donation,
      taxableAmount: computeOneOffDonationTaxableAmount(donation),
      date: normalizedDate
    };
    list.push(normalizedDonation);
    await this.db.deliveries.update(id, {
      oneOffDonations: list,
      updatedAt: now,
      synced: false
    });
  }

  async appendOneOffDelivery(
    id: string,
    deliveredDozens: number | undefined,
    donation?: DonationInfo
  ): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    if (!existing) return;
    const list = Array.isArray(existing.oneOffDeliveries)
      ? [...existing.oneOffDeliveries]
      : [];
    const normalizedDate = normalizeEventDate(donation?.date) ?? now;
    const normalizedDonation = donation
      ? ({
          ...donation,
          taxableAmount: computeTaxableAmount(donation),
          date: normalizedDate
        } as DonationInfo)
      : undefined;
    list.push({
      deliveredDozens,
      donation: normalizedDonation,
      date: normalizedDate
    });
    await this.db.deliveries.update(id, {
      oneOffDeliveries: list,
      updatedAt: now,
      synced: false
    });
  }

  async updateDeliveryFields(id: string, updates: Partial<Delivery>): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    if (!existing) return;
    const donation =
      (updates.donation as DonationInfo | undefined) ??
      (existing.donation as DonationInfo | undefined) ??
      defaultDonation(existing as Delivery);
    if (updates.dozens != null) {
      donation.suggestedAmount = updates.dozens * this.getSuggestedRate();
    }
    const status =
      updates.status ??
      this.computeChangeStatus(existing as Delivery, updates as Delivery, donation);
    const next: Partial<Delivery> = {
      ...updates,
      donation,
      status,
      updatedAt: now,
      synced: false
    };
    await this.db.deliveries.update(id, next);
    await this.refreshRouteStats(existing.routeDate, now);
  }

  async saveRun(run: DeliveryRun): Promise<void> {
    await this.db.runs.put(run);
  }

  async getRun(id: string): Promise<DeliveryRun | undefined> {
    return this.db.runs.get(id);
  }

  async getAllReceiptsSummary(): Promise<{
    delivered: number;
    skipped: number;
    total: number;
    dozensDelivered: number;
    dozensTotal: number;
  } | null> {
    const [entries, deliveries] = await Promise.all([
      this.getAllRunEntries(),
      this.getAllDeliveries()
    ]);
    if (!entries.length && !deliveries.length) {
      return null;
    }

    const deliveredEntries = entries.filter((e) => e.status === 'delivered');
    const skippedEntries = entries.filter((e) => e.status === 'skipped');
    const runDozensTotal = entries.reduce(
      (sum, e) => sum + (e.dozens ?? 0),
      0
    );
    const runDozensDelivered = deliveredEntries.reduce(
      (sum, e) => sum + (e.dozens ?? 0),
      0
    );

    const oneOffDozens = deliveries.reduce((sum, d) => {
      const extra = (d.oneOffDeliveries ?? []).reduce(
        (inner, off) => inner + Number(off.deliveredDozens ?? 0),
        0
      );
      return sum + extra;
    }, 0);

    const oneOffDeliveryCount = deliveries.reduce((sum, d) => {
      return sum + (d.oneOffDeliveries?.length ?? 0);
    }, 0);

    return {
      // One-off deliveries count as additional delivered stops.
      delivered: deliveredEntries.length + oneOffDeliveryCount,
      skipped: skippedEntries.length,
      total: entries.length + oneOffDeliveryCount,
      dozensDelivered: runDozensDelivered + oneOffDozens,
      dozensTotal: runDozensTotal + oneOffDozens
    };
  }

  async saveBaseStops(stops: BaseStop[]): Promise<void> {
    await this.db.baseStops.clear();
    await this.db.baseStops.bulkPut(stops);
  }

  async getBaseStops(): Promise<BaseStop[]> {
    return this.db.baseStops.toArray();
  }

  async saveImportState(state: CsvImportState): Promise<void> {
    await this.db.importStates.put(state);
  }

  async getImportState(id = 'default'): Promise<CsvImportState | undefined> {
    return this.db.importStates.get(id);
  }

  async clearAll(): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.deliveries,
        this.db.routes,
        this.db.runs,
        this.db.runEntries,
        this.db.baseStops,
        this.db.importStates
      ],
      async () => {
        await this.db.deliveries.clear();
        await this.db.routes.clear();
        await this.db.runs.clear();
        await this.db.runEntries.clear();
        await this.db.baseStops.clear();
        await this.db.importStates.clear();
      }
    );
  }

  async restoreAllFromBackup(
    deliveries: Delivery[],
    importState: CsvImportState,
    runs: DeliveryRun[],
    runEntries: RunSnapshotEntry[]
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.transaction(
      'rw',
      [
        this.db.deliveries,
        this.db.routes,
        this.db.runs,
        this.db.runEntries,
        this.db.baseStops,
        this.db.importStates
      ],
      async () => {
        await this.db.deliveries.clear();
        await this.db.routes.clear();
        await this.db.runs.clear();
        await this.db.runEntries.clear();
        await this.db.baseStops.clear();
        await this.db.importStates.clear();

        if (deliveries.length) {
          await this.db.deliveries.bulkAdd(deliveries);
          const dates = Array.from(
            new Set(deliveries.map((d) => d.routeDate))
          );
          for (const routeDate of dates) {
            const routeDeliveries = deliveries.filter(
              (d) => d.routeDate === routeDate
            );
            const totalStops = routeDeliveries.length;
            const deliveredCount = routeDeliveries.filter(
              (d) => d.status === 'delivered'
            ).length;
            const skippedCount = routeDeliveries.filter(
              (d) => d.status === 'skipped'
            ).length;
            await this.db.routes.put({
              routeDate,
              totalStops,
              deliveredCount,
              skippedCount,
              createdAt: now,
              lastUpdatedAt: now,
              completed: deliveredCount + skippedCount === totalStops
            });
          }
        }

        if (runs.length) {
          await this.db.runs.bulkPut(runs);
        }
        if (runEntries.length) {
          await this.db.runEntries.bulkAdd(runEntries);
        }

        await this.db.importStates.put(importState);
      }
    );
  }

  private async refreshRouteStats(routeDate: string, timestamp: string): Promise<void> {
    const existing = await this.db.routes.get(routeDate);
    const [deliveredCount, skippedCount, totalStops] = await Promise.all([
      this.db.deliveries.where({ routeDate, status: 'delivered' as DeliveryStatus }).count(),
      this.db.deliveries.where({ routeDate, status: 'skipped' as DeliveryStatus }).count(),
      this.db.deliveries.where('routeDate').equals(routeDate).count()
    ]);

    await this.db.routes.put({
      routeDate,
      totalStops,
      deliveredCount,
      skippedCount,
      createdAt: existing?.createdAt ?? timestamp,
      lastUpdatedAt: timestamp,
      name: existing?.name,
      currentIndex: existing?.currentIndex,
      completed: deliveredCount + skippedCount === totalStops
    });
  }

  private async requestPersistence(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
      return;
    }
    try {
      const granted = await navigator.storage.persist();
      if (!granted) {
        console.warn('Storage persistence not granted');
      }
    } catch (err) {
      console.warn('Storage persistence request failed', err);
    }
  }

  private deriveWeekFromRoute(routeDate: string): string {
    // Fallback if schedule identifier cannot be extracted from existing deliveries.
    // Schedule info should come from the delivery data (originally in Date column).
    return 'WeekA';
  }

  private baseDonation(existing: Delivery): DonationInfo {
    const baselineDozens = existing.originalDozens ?? existing.dozens ?? 0;
    return { status: 'NotRecorded', suggestedAmount: baselineDozens * 4 };
  }

  private isUnsubscribed(stop: Delivery): boolean {
    const reason = stop.skippedReason?.toLowerCase?.().trim() ?? '';
    return stop.subscribed === false || reason.includes('unsubscribed');
  }

  computeChangeStatus(
    stop: Delivery,
    overrides?: Partial<Delivery>,
    donationOverride?: DonationInfo
  ): DeliveryStatus {
    if (stop.status === 'delivered') return 'delivered';
    if (this.isUnsubscribed(stop) || stop.status === 'skipped') return 'skipped';

    const baseDozens = stop.originalDozens ?? stop.dozens ?? 0;
    const currentDozens = overrides?.dozens ?? stop.dozens ?? 0;

    const baseDonation = { ...(stop.originalDonation ?? this.baseDonation(stop)) };
    const currentDonation = {
      ...(donationOverride ??
        overrides?.donation ??
        stop.donation ??
        defaultDonation(stop))
    };
    const baseStatus = baseDonation.status ?? 'NotRecorded';
    const currStatus = currentDonation.status ?? 'NotRecorded';
    const currentSuggested = (overrides?.dozens ?? stop.dozens ?? 0) * 4;
    const currentAmount = Number(
      currentDonation.amount ?? currentDonation.suggestedAmount ?? currentSuggested
    );

    let donationChanged = baseStatus !== currStatus;

    if (currStatus === 'Donated') {
      if ((baseDonation.method ?? null) !== (currentDonation.method ?? null)) {
        donationChanged = true;
      }
      if (currentAmount !== currentSuggested) {
        donationChanged = true;
      } else if (!donationChanged && baseStatus === 'Donated') {
        donationChanged = false;
      }
    }

    const qtyChanged = Number(baseDozens) !== Number(currentDozens);

    return donationChanged || qtyChanged ? 'changed' : '';
  }
}
