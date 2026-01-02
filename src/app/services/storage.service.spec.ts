import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { Delivery, DonationInfo } from '../models/delivery.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';
import { createStorageWithMiniRoute } from '../../testing/test-db.utils';
import { normalizeEventDate } from '../utils/date-utils';

const SUGGESTED_KEY = 'suggestedDonationRate';

const buildDelivery = (overrides: Partial<Delivery> = {}): Delivery => {
  const id = overrides.id ?? `delivery_${Math.random()}`;
  const routeDate = overrides.routeDate ?? '2025-01-01';
  const now = overrides.createdAt ?? new Date().toISOString();
  const dozens = overrides.dozens ?? 1;

  return {
    id,
    runId: overrides.runId ?? routeDate,
    baseRowId: overrides.baseRowId ?? id,
    week: overrides.week ?? 'ScheduleA',
    routeDate,
    name: overrides.name ?? 'Test Name',
    address: overrides.address ?? '123 Main St',
    city: overrides.city ?? 'Testville',
    state: overrides.state ?? 'TS',
    zip: overrides.zip ?? '12345',
    dozens,
    originalDozens: overrides.originalDozens ?? dozens,
    deliveredDozens: overrides.deliveredDozens,
    deliveryOrder: overrides.deliveryOrder ?? 0,
    subscribed: overrides.subscribed ?? true,
    notes: overrides.notes ?? '',
    sortIndex: overrides.sortIndex ?? 0,
    status: overrides.status ?? '',
    donation: overrides.donation,
    originalDonation: overrides.originalDonation,
    oneOffDonations: overrides.oneOffDonations,
    oneOffDeliveries: overrides.oneOffDeliveries,
    deliveredAt: overrides.deliveredAt,
    skippedAt: overrides.skippedAt,
    skippedReason: overrides.skippedReason,
    createdAt: now,
    updatedAt: overrides.updatedAt ?? now,
    synced: overrides.synced ?? false
  };
};

describe('StorageService regression tests', () => {
  let storage: StorageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [StorageService]
    }).compileComponents();

    storage = TestBed.inject(StorageService);
    await storage.clearAll();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SUGGESTED_KEY);
    }
  });

  afterEach(async () => {
    await storage.clearAll();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SUGGESTED_KEY);
    }
  });

  it('normalizes imported deliveries and baseRowId defaults', async () => {
    storage.setSuggestedRate(5);
    const now = '2025-02-01T00:00:00.000Z';
    const raw: Partial<Delivery> = {
      id: 'import-1',
      routeDate: '2025-02-01',
      name: 'Importer',
      address: '1 Import Way',
      city: 'DataTown',
      state: 'TS',
      zip: '00000',
      dozens: 3,
      deliveryOrder: 0,
      sortIndex: 0,
      status: '',
      createdAt: now,
      updatedAt: now
    };

    await storage.importDeliveries([raw as unknown as Delivery]);

    const deliveries = await storage.getAllDeliveries();
    expect(deliveries.length).toBe(1);
    const stored = deliveries[0];
    expect(stored.runId).toBe('2025-02-01');
    expect(stored.baseRowId).toBe('import-1');
    expect(stored.originalDozens).toBe(3);
    expect(stored.donation?.status).toBe('NotRecorded');
    expect(stored.donation?.suggestedAmount).toBe(15);
    expect(stored.donation?.taxableAmount).toBe(0);
    expect(stored.originalDonation?.suggestedAmount).toBe(15);
    expect(stored.subscribed).toBe(true);
  });

  it('addDelivery inserts at the expected order and reindexes', async () => {
    await createStorageWithMiniRoute();

    const added = await storage.addDelivery('2025-01-01', {
      name: 'New Stop',
      deliveryOrder: 1,
      dozens: 1
    });

    const routeDeliveries = await storage.getDeliveriesByRoute('2025-01-01');
    expect(routeDeliveries.length).toBe(3);
    expect(routeDeliveries[0].id).toBe(added.id);
    routeDeliveries.forEach((delivery, index) => {
      expect(delivery.sortIndex).toBe(index);
      expect(delivery.deliveryOrder).toBe(index);
    });
  });

  it('saveSortOrder densifies sortIndex and deliveryOrder', async () => {
    await createStorageWithMiniRoute();

    const initial = await storage.getDeliveriesByRoute('2025-01-01');
    const reversed = initial.slice().reverse();
    await storage.saveSortOrder(reversed);

    const updated = await storage.getDeliveriesByRoute('2025-01-01');
    expect(updated[0].id).toBe(initial[1].id);
    updated.forEach((delivery, index) => {
      expect(delivery.sortIndex).toBe(index);
      expect(delivery.deliveryOrder).toBe(index);
    });
  });

  it('resetDelivery preserves unsubscribed state', async () => {
    const unsubscribed = buildDelivery({
      id: 'unsub-1',
      routeDate: '2025-03-01',
      runId: '2025-03-01',
      baseRowId: 'unsub-1',
      status: 'delivered',
      subscribed: false,
      deliveredAt: '2025-03-01T00:00:00.000Z'
    });
    await storage.importDeliveries([unsubscribed]);

    await storage.resetDelivery('unsub-1');

    const updated = await storage.getDeliveryById('unsub-1');
    expect(updated?.status).toBe('skipped');
    expect(updated?.skippedReason).toBe('Unsubscribed');
    expect(updated?.skippedAt).toBeTruthy();
  });

  it('resetRoute preserves unsubscribed stops by status or reason', async () => {
    const unsubscribed = buildDelivery({
      id: 'unsub-2',
      routeDate: '2025-04-01',
      runId: '2025-04-01',
      baseRowId: 'unsub-2',
      status: 'skipped',
      skippedReason: 'Unsubscribed'
    });
    const regular = buildDelivery({
      id: 'sub-1',
      routeDate: '2025-04-01',
      runId: '2025-04-01',
      baseRowId: 'sub-1',
      status: 'delivered'
    });
    await storage.importDeliveries([unsubscribed, regular]);

    await storage.resetRoute('2025-04-01');

    const unsubUpdated = await storage.getDeliveryById('unsub-2');
    const regularUpdated = await storage.getDeliveryById('sub-1');
    expect(unsubUpdated?.status).toBe('skipped');
    expect(unsubUpdated?.skippedReason).toBe('Unsubscribed');
    expect(unsubUpdated?.skippedAt).toBeTruthy();
    expect(regularUpdated?.status).toBe('');
    expect(regularUpdated?.skippedReason).toBeUndefined();
  });

  it('computeChangeStatus tracks quantity and donation changes', () => {
    const baseDonation: DonationInfo = {
      status: 'NotRecorded',
      suggestedAmount: 8
    };
    const stop = buildDelivery({
      id: 'c1',
      routeDate: '2025-01-01',
      runId: '2025-01-01',
      baseRowId: 'c1',
      dozens: 2,
      originalDozens: 2,
      donation: { ...baseDonation },
      originalDonation: { ...baseDonation }
    });

    expect(storage.computeChangeStatus(stop)).toBe('');
    expect(storage.computeChangeStatus(stop, { dozens: 3 })).toBe('changed');
    const donated: DonationInfo = {
      status: 'Donated',
      method: 'cash',
      amount: 10,
      suggestedAmount: 8
    };
    expect(storage.computeChangeStatus(stop, undefined, donated)).toBe('changed');

    const delivered: Delivery = { ...stop, status: 'delivered' };
    expect(storage.computeChangeStatus(delivered)).toBe('delivered');

    const unsubscribed: Delivery = { ...stop, subscribed: false };
    expect(storage.computeChangeStatus(unsubscribed)).toBe('skipped');
  });

  it('normalizes one-off donation and delivery dates', async () => {
    await createStorageWithMiniRoute();

    const donationDateInput = '2025-06-15';
    const deliveryDateInput = '2025-11-20';
    const expectedDonationDate = normalizeEventDate(donationDateInput);
    const expectedDeliveryDate = normalizeEventDate(deliveryDateInput);
    expect(expectedDonationDate).toBeTruthy();
    expect(expectedDeliveryDate).toBeTruthy();

    await storage.appendOneOffDonation('c1-r1', {
      status: 'Donated',
      method: 'cash',
      amount: 8,
      suggestedAmount: 8,
      date: donationDateInput
    });

    await storage.appendOneOffDelivery('c1-r1', 2, {
      status: 'Donated',
      method: 'ach',
      amount: 12,
      suggestedAmount: 12,
      date: deliveryDateInput
    });

    const updated = await storage.getDeliveryById('c1-r1');
    expect(updated?.oneOffDonations?.[0]?.date).toBe(expectedDonationDate);
    expect(updated?.oneOffDeliveries?.[0]?.date).toBe(expectedDeliveryDate);
    expect(updated?.oneOffDeliveries?.[0]?.donation?.date).toBe(expectedDeliveryDate);
  });

  it('updates one-off dates and persists normalized values', async () => {
    await createStorageWithMiniRoute();

    await storage.appendOneOffDonation('c1-r1', {
      status: 'Donated',
      method: 'cash',
      amount: 8,
      suggestedAmount: 8,
      date: '2025-06-15'
    });

    await storage.appendOneOffDelivery('c1-r1', 2, {
      status: 'Donated',
      method: 'ach',
      amount: 12,
      suggestedAmount: 12,
      date: '2025-11-20'
    });

    const donationUpdate = '2025-07-04';
    const deliveryUpdate = '2025-12-01';

    await storage.updateOneOffDonationByIndex('c1-r1', 0, {
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 8,
      date: donationUpdate
    });

    await storage.updateOneOffDeliveryByIndex('c1-r1', 0, {
      dozens: 3,
      donationStatus: 'Donated',
      donationMethod: 'ach',
      donationAmount: 12,
      date: deliveryUpdate
    });

    const expectedDonationDate = normalizeEventDate(donationUpdate);
    const expectedDeliveryDate = normalizeEventDate(deliveryUpdate);
    expect(expectedDonationDate).toBeTruthy();
    expect(expectedDeliveryDate).toBeTruthy();

    const updated = await storage.getDeliveryById('c1-r1');
    expect(updated?.oneOffDonations?.[0]?.date).toBe(expectedDonationDate);
    expect(updated?.oneOffDeliveries?.[0]?.date).toBe(expectedDeliveryDate);
    expect(updated?.oneOffDeliveries?.[0]?.donation?.date).toBe(expectedDeliveryDate);

    const reloaded = await storage.getDeliveryById('c1-r1');
    expect(reloaded?.oneOffDonations?.[0]?.date).toBe(expectedDonationDate);
    expect(reloaded?.oneOffDeliveries?.[0]?.date).toBe(expectedDeliveryDate);
  });

  it('filters receipt history by tax year', async () => {
    const delivery = buildDelivery({
      id: 'delivery-1',
      baseRowId: 'base-1',
      routeDate: '2024-01-01'
    });

    await storage.importDeliveries([delivery]);

    await storage.appendOneOffDonation('delivery-1', {
      status: 'Donated',
      method: 'cash',
      amount: 5,
      suggestedAmount: 4,
      date: '2023-05-01'
    });

    await storage.appendOneOffDelivery('delivery-1', 2, {
      status: 'Donated',
      method: 'ach',
      amount: 8,
      suggestedAmount: 8,
      date: '2024-07-01'
    });

    const runEntry: RunSnapshotEntry = {
      id: 'run-entry-1',
      runId: 'run-2025',
      baseRowId: 'base-1',
      name: delivery.name,
      address: delivery.address,
      city: delivery.city,
      state: delivery.state,
      zip: delivery.zip,
      status: 'delivered',
      dozens: 2,
      deliveryOrder: 0,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 8,
      taxableAmount: 0,
      eventDate: '2025-02-01'
    };

    await storage.saveRunEntryOrdering('run-2025', [runEntry]);

    const receipts2024 = await storage.getReceiptHistoryByBaseRowId('base-1', 2024);
    expect(receipts2024.length).toBe(1);
    expect(receipts2024[0]?.kind).toBe('oneOffDelivery');

    const receipts2023 = await storage.getReceiptHistoryByBaseRowId('base-1', 2023);
    expect(receipts2023.length).toBe(1);
    expect(receipts2023[0]?.kind).toBe('oneOffDonation');

    const receipts2025 = await storage.getReceiptHistoryByBaseRowId('base-1', 2025);
    expect(receipts2025.length).toBe(1);
    expect(receipts2025[0]?.kind).toBe('run');
  });

  it('deletes one-off receipts by index', async () => {
    await createStorageWithMiniRoute();

    await storage.appendOneOffDonation('c1-r1', {
      status: 'Donated',
      method: 'cash',
      amount: 8,
      suggestedAmount: 8,
      date: '2025-06-15'
    });

    await storage.appendOneOffDelivery('c1-r1', 2, {
      status: 'Donated',
      method: 'ach',
      amount: 12,
      suggestedAmount: 12,
      date: '2025-11-20'
    });

    await storage.deleteOneOffDonationByIndex('c1-r1', 0);
    await storage.deleteOneOffDeliveryByIndex('c1-r1', 0);

    const updated = await storage.getDeliveryById('c1-r1');
    expect(updated?.oneOffDonations?.length ?? 0).toBe(0);
    expect(updated?.oneOffDeliveries?.length ?? 0).toBe(0);
    expect(updated?.synced).toBeFalse();
  });

  it('deletes run entries and reindexes order', async () => {
    await createStorageWithMiniRoute();

    await storage.markDelivered('c1-r1', 2);
    await storage.updateDonation('c1-r1', {
      status: 'Donated',
      method: 'cash',
      amount: 8,
      suggestedAmount: 8
    });
    await storage.markSkipped('c2-r1', 'Not home');
    await storage.completeRun('2025-01-01', false);

    const entries = await storage.getAllRunEntries();
    expect(entries.length).toBe(2);
    const target = entries[0];

    await storage.deleteRunEntry(target.id);

    const remaining = await storage.getAllRunEntries();
    expect(remaining.length).toBe(1);
    expect(remaining[0].deliveryOrder).toBe(0);
  });

  it('completeRun writes run entries and resets live data', async () => {
    await createStorageWithMiniRoute();

    await storage.markDelivered('c1-r1', 2);
    await storage.updateDonation('c1-r1', {
      status: 'Donated',
      method: 'cash',
      amount: 8,
      suggestedAmount: 8
    });
    await storage.markSkipped('c2-r1', 'Not home');

    await storage.completeRun('2025-01-01', false);

    const entries = await storage.getAllRunEntries();
    expect(entries.length).toBe(2);
    const runIds = new Set(entries.map((entry) => entry.runId));
    expect(runIds.size).toBe(1);

    const deliveredEntry = entries.find((entry) => entry.baseRowId === 'c1');
    const skippedEntry = entries.find((entry) => entry.baseRowId === 'c2');
    expect(deliveredEntry?.status).toBe('delivered');
    expect(skippedEntry?.status).toBe('skipped');

    const resetDeliveries = await storage.getDeliveriesByRoute('2025-01-01');
    resetDeliveries.forEach((delivery) => {
      expect(delivery.status).toBe('');
      expect(delivery.deliveredAt).toBeUndefined();
      expect(delivery.deliveredDozens).toBeUndefined();
      expect(delivery.skippedReason).toBeUndefined();
    });
  });

  it('getAllReceiptsSummary includes one-off deliveries', async () => {
    await createStorageWithMiniRoute();

    await storage.markDelivered('c1-r1', 2);
    await storage.markSkipped('c2-r1', 'Not home');
    await storage.completeRun('2025-01-01', false);

    await storage.appendOneOffDelivery('c1-r1', 3, {
      status: 'Donated',
      method: 'cash',
      amount: 12,
      suggestedAmount: 12,
      date: '2025-02-02'
    });

    const summary = await storage.getAllReceiptsSummary();
    expect(summary).toEqual({
      delivered: 2,
      skipped: 1,
      total: 3,
      dozensDelivered: 5,
      dozensTotal: 5
    });
  });
});
