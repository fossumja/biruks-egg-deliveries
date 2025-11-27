import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Delivery, DeliveryStatus, DonationInfo } from '../models/delivery.model';
import { Route } from '../models/route.model';
import { DeliveryRun } from '../models/delivery-run.model';
import { BaseStop } from '../models/base-stop.model';
import { CsvImportState } from '../models/csv-import-state.model';

function defaultDonation(d?: Delivery): DonationInfo {
  return {
    status: 'NotRecorded',
    suggestedAmount: (d?.dozens ?? 0) * 4
  };
}

class AppDB extends Dexie {
  deliveries!: Table<Delivery, string>;
  routes!: Table<Route, string>;
  runs!: Table<DeliveryRun, string>;
  baseStops!: Table<BaseStop, string>;
  importStates!: Table<CsvImportState, string>;

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
  }
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private db: AppDB;

  constructor() {
    this.db = new AppDB();
    void this.requestPersistence();
  }

  async importDeliveries(deliveries: Delivery[]): Promise<void> {
    const now = new Date().toISOString();
    const normalized = deliveries.map((d) => ({
      ...d,
      runId: d.runId ?? d.routeDate ?? 'default-run',
      baseRowId: d.baseRowId ?? d.id,
      originalDozens: d.originalDozens ?? d.dozens,
      donation: d.donation ?? defaultDonation(d),
      subscribed: d.subscribed ?? true
    }));
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

  getDeliveriesByRoute(routeDate: string): Promise<Delivery[]> {
    return this.db.deliveries.where('routeDate').equals(routeDate).sortBy('sortIndex');
  }

  getDeliveriesByRun(runId: string): Promise<Delivery[]> {
    return this.db.deliveries.where('runId').equals(runId).sortBy('sortIndex');
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

  async resetDelivery(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      const delivery = await this.db.deliveries.get(id);
      if (!delivery) return;
      const restoredDozens = delivery.originalDozens ?? delivery.dozens;
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
        donation: defaultDonation({ ...(delivery as Delivery), dozens: restoredDozens }),
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
        updatedAt: now,
        synced: false
      }));
      await this.db.deliveries.bulkPut(reset);
      await this.refreshRouteStats(routeDate, now);
    });
  }

  async addDelivery(routeDate: string, payload: Partial<Delivery>): Promise<Delivery> {
    const now = new Date().toISOString();
    const currentCount = await this.db.deliveries.where('routeDate').equals(routeDate).count();
    const week = payload.week ?? this.deriveWeekFromRoute(routeDate);
    const baseRowId = payload.baseRowId ?? `NEW_${crypto.randomUUID?.() ?? Date.now()}`;
    const id = payload.id ?? crypto.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
    const dozens = payload.dozens ?? 0;
    const newDelivery: Delivery = {
      id,
      runId: payload.runId ?? `${routeDate}_${week}`,
      baseRowId,
      routeDate,
      week,
      name: payload.name ?? '',
      address: payload.address ?? '',
      city: payload.city ?? '',
      state: payload.state ?? '',
      zip: payload.zip,
      dozens,
      originalDozens: payload.originalDozens ?? dozens,
      deliveryOrder: currentCount,
      sortIndex: currentCount,
      notes: payload.notes,
      status: payload.status ?? '',
      donation: payload.donation ?? defaultDonation({ ...(payload as Delivery), dozens }),
      subscribed: payload.subscribed ?? true,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      await this.db.deliveries.add(newDelivery);
      await this.refreshRouteStats(routeDate, now);
    });

    return newDelivery;
  }

  async updatePlannedDozens(id: string, dozens: number): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    const originalDozens = existing?.originalDozens ?? existing?.dozens ?? dozens;
    const donation = (existing?.donation as DonationInfo | undefined) ?? defaultDonation(existing as Delivery);
    donation.suggestedAmount = dozens * 4;
    await this.db.deliveries.update(id, {
      dozens,
      originalDozens,
      status: 'changed',
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
    donation.suggestedAmount = deliveredDozens * 4;
    await this.db.deliveries.update(id, {
      deliveredDozens,
      dozens: deliveredDozens,
      status: 'changed',
      donation,
      updatedAt: now,
      synced: false
    });
  }

  async updateDonation(id: string, donation: DonationInfo): Promise<void> {
    const now = new Date().toISOString();
    await this.db.deliveries.update(id, { donation, updatedAt: now, synced: false });
  }

  async updateDeliveryFields(id: string, updates: Partial<Delivery>): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db.deliveries.get(id);
    if (!existing) return;
    const next: Partial<Delivery> = {
      ...updates,
      updatedAt: now,
      synced: false
    };
    if (updates.dozens != null) {
      const donation = (existing.donation as DonationInfo | undefined) ?? defaultDonation(existing as Delivery);
      donation.suggestedAmount = updates.dozens * 4;
      next.donation = donation;
      next.status = updates.status ?? 'changed';
    }
    await this.db.deliveries.update(id, next);
    await this.refreshRouteStats(existing.routeDate, now);
  }

  async saveRun(run: DeliveryRun): Promise<void> {
    await this.db.runs.put(run);
  }

  async getRun(id: string): Promise<DeliveryRun | undefined> {
    return this.db.runs.get(id);
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
    await this.db.transaction('rw', this.db.deliveries, this.db.routes, async () => {
      await this.db.deliveries.clear();
      await this.db.routes.clear();
    });
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
    // Simple fallback if week isn’t supplied; keeps runId stable enough.
    return 'WeekA';
  }
}
