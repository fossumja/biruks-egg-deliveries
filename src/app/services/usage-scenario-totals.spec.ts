import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { BackupService } from './backup.service';
import { createStorageWithMiniRoute } from '../../testing/test-db.utils';
import Papa from 'papaparse';
import { normalizeEventDate } from '../utils/date-utils';

/**
 * Usage-oriented totals tests
 *
 * These are small, data-level tests that mirror some of the
 * scenarios described in docs/testing/usage-scenario-tests.md, focusing on
 * TotalDonation / TotalDozens behavior.
 */

describe('Usage scenario totals (data-level)', () => {
  let storage: StorageService;
  let backup: BackupService;

  const buildImportState = (deliveries: { baseRowId: string; name: string }[]) => {
    const headers = ['BaseRowId', 'Name'];
    const rowsByBaseRowId: Record<string, string[]> = {};
    deliveries.forEach((delivery) => {
      if (!rowsByBaseRowId[delivery.baseRowId]) {
        rowsByBaseRowId[delivery.baseRowId] = [delivery.baseRowId, delivery.name];
      }
    });
    return {
      headers,
      rowsByBaseRowId,
      mode: 'baseline' as const
    };
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [StorageService, BackupService]
    }).compileComponents();

    storage = await createStorageWithMiniRoute();
    backup = TestBed.inject(BackupService);
  });

  it('totals one-off donations only (no runs delivered)', async () => {
    const rate = storage.getSuggestedRate();

    // For customer c2, add two one-off donations across two runs, no delivered status.
    const oneOff1 = {
      status: 'Donated' as const,
      method: 'cash' as const,
      amount: 5,
      suggestedAmount: 5
    };
    const oneOff2 = {
      status: 'Donated' as const,
      method: 'venmo' as const,
      amount: 7.5,
      suggestedAmount: 7.5
    };

    await storage.appendOneOffDonation('c2-r1', oneOff1);
    await storage.appendOneOffDonation('c2-r2', oneOff2);

    const deliveries = await storage.getAllDeliveries();
    const totals = (backup as any).computeTotalsByBase(deliveries) as Map<
      string,
      { donation: number; dozens: number; taxable: number }
    >;

    const c2Totals = totals.get('c2');
    expect(c2Totals).toBeDefined();
    // Donation is just the two one-offs
    expect(c2Totals!.donation).toBeCloseTo(5 + 7.5, 5);
    // No run deliveries or one-off deliveries, so dozens stay at 0
    expect(c2Totals!.dozens).toBe(0);
  });

  it('filters one-off totals by tax year', async () => {
    await storage.appendOneOffDonation('c2-r1', {
      status: 'Donated' as const,
      method: 'cash' as const,
      amount: 5,
      suggestedAmount: 5,
      date: '2024-11-10'
    });
    await storage.appendOneOffDonation('c2-r2', {
      status: 'Donated' as const,
      method: 'venmo' as const,
      amount: 7,
      suggestedAmount: 7,
      date: '2025-01-10'
    });

    const deliveries = await storage.getAllDeliveries();
    const totals2024 = (backup as any).computeTotalsByBase(
      deliveries,
      [],
      undefined,
      2024
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const totals2025 = (backup as any).computeTotalsByBase(
      deliveries,
      [],
      undefined,
      2025
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;

    expect(totals2024.get('c2')?.donation ?? 0).toBeCloseTo(5, 5);
    expect(totals2025.get('c2')?.donation ?? 0).toBeCloseTo(7, 5);
  });

  it('totals one-off deliveries only (dozens + donation)', async () => {
    const rate = storage.getSuggestedRate();

    // For customer c2, add two one-off deliveries: 1 dozen and 2 dozen
    const offDonation1 = {
      status: 'Donated' as const,
      method: 'cash' as const,
      amount: rate,
      suggestedAmount: rate
    };
    const offDonation2 = {
      status: 'Donated' as const,
      method: 'paypal' as const,
      amount: 2 * rate,
      suggestedAmount: 2 * rate
    };

    await storage.appendOneOffDelivery('c2-r1', 1, offDonation1);
    await storage.appendOneOffDelivery('c2-r2', 2, offDonation2);

    const deliveries = await storage.getAllDeliveries();
    const totals = (backup as any).computeTotalsByBase(deliveries) as Map<
      string,
      { donation: number; dozens: number; taxable: number }
    >;

    const c2Totals = totals.get('c2');
    expect(c2Totals).toBeDefined();
    // Donation is sum of the two off-schedule donations
    expect(c2Totals!.donation).toBeCloseTo(rate + 2 * rate, 5);
    // Dozens is sum of off-schedule dozens
    expect(c2Totals!.dozens).toBe(1 + 2);
  });

  it('accumulates across multiple runs with interleaved one-offs', async () => {
    const rate = storage.getSuggestedRate();

    // RUN 1: deliver c1-r1 with a run donation
    const run1Donation = {
      status: 'Donated' as const,
      method: 'cash' as const,
      amount: 2 * rate,
      suggestedAmount: 2 * rate
    };
    await storage.markDelivered('c1-r1', 2);
    await storage.updateDonation('c1-r1', run1Donation);

    // Between runs: one-off donation + one-off delivery
    const midDonation = {
      status: 'Donated' as const,
      method: 'venmo' as const,
      amount: 5,
      suggestedAmount: 5
    };
    await storage.appendOneOffDonation('c1-r1', midDonation);

    const midDeliveryDonation = {
      status: 'Donated' as const,
      method: 'other' as const,
      amount: 3,
      suggestedAmount: 3
    };
    await storage.appendOneOffDelivery('c1-r1', 1, midDeliveryDonation);

    // RUN 2: deliver c1-r2 with changed dozens and its own donation
    const run2Donation = {
      status: 'Donated' as const,
      method: 'ach' as const,
      amount: 3 * rate,
      suggestedAmount: 3 * rate
    };
    await storage.markDelivered('c1-r2', 3);
    await storage.updateDonation('c1-r2', run2Donation);

    const deliveries = await storage.getAllDeliveries();
    const totals = (backup as any).computeTotalsByBase(deliveries) as Map<
      string,
      { donation: number; dozens: number; taxable: number }
    >;

    const c1Totals = totals.get('c1');
    expect(c1Totals).toBeDefined();

    const expectedDonation =
      2 * rate + // run 1
      5 + // mid one-off donation
      3 + // donation on one-off delivery
      3 * rate; // run 2
    const expectedDozens =
      2 + // run 1 dozens
      1 + // one-off delivery dozens
      3; // run 2 dozens

    expect(c1Totals!.donation).toBeCloseTo(expectedDonation, 5);
    expect(c1Totals!.dozens).toBe(expectedDozens);
  });

  it('reflects totals correctly in the basic CSV export format', async () => {
    const rate = storage.getSuggestedRate();

    // Arrange: run + one-offs for c1, similar to backup.service.spec
    const donationForRun = {
      status: 'Donated' as const,
      method: 'cash' as const,
      amount: 2 * rate,
      suggestedAmount: 2 * rate
    };
    await storage.markDelivered('c1-r1', 2);
    await storage.updateDonation('c1-r1', donationForRun);

    const oneOffDonation = {
      status: 'Donated' as const,
      method: 'venmo' as const,
      amount: 10,
      suggestedAmount: 10
    };
    await storage.appendOneOffDonation('c1-r1', oneOffDonation);

    const oneOffDeliveryDonation = {
      status: 'Donated' as const,
      method: 'ach' as const,
      amount: 15,
      suggestedAmount: 15
    };
    await storage.appendOneOffDelivery('c1-r1', 3, oneOffDeliveryDonation);

    const deliveries = await storage.getAllDeliveries();
    const csv = (backup as any).toCsv(deliveries) as string;

    const parsed = Papa.parse(csv, { header: true });
    const rows = parsed.data as any[];

    // Find any row for baseRowId 'c1' (Name 'Alice')
    const aliceRows = rows.filter((r) => r.Name === 'Alice');
    expect(aliceRows.length).toBeGreaterThan(0);

    const expectedDonation = 2 * rate + 10 + 15;
    const expectedDozens = 2 + 3;
    // Baseline is 2*rate + 3*rate (deliveries only), so the extra $10
    // one-off donation is fully deductible.
    const expectedTaxable = 10;

    aliceRows.forEach((row) => {
      const totalDonation = parseFloat(row.TotalDonation);
      const totalDozens = parseInt(row.TotalDozens, 10);
      const totalTaxable = parseFloat(row.TotalTaxableDonation);
      expect(totalDonation).toBeCloseTo(expectedDonation, 5);
      expect(totalDozens).toBe(expectedDozens);
      expect(totalTaxable).toBeCloseTo(expectedTaxable, 5);
    });
  });

  it('persists one-off dates and exports EventDate values', async () => {
    const donationDateInput = '2025-06-15';
    const deliveryDateInput = '2025-11-20';
    const expectedDonationDate = normalizeEventDate(donationDateInput);
    const expectedDeliveryDate = normalizeEventDate(deliveryDateInput);
    expect(expectedDonationDate).toBeTruthy();
    expect(expectedDeliveryDate).toBeTruthy();

    await storage.appendOneOffDonation('c1-r1', {
      status: 'Donated' as const,
      method: 'cash' as const,
      amount: 8,
      suggestedAmount: 8,
      date: donationDateInput
    });

    await storage.appendOneOffDelivery('c2-r1', 2, {
      status: 'Donated' as const,
      method: 'ach' as const,
      amount: 12,
      suggestedAmount: 12,
      date: deliveryDateInput
    });

    const updatedDonation = await storage.getDeliveryById('c1-r1');
    expect(updatedDonation?.oneOffDonations?.[0]?.date).toBe(expectedDonationDate);

    const updatedDelivery = await storage.getDeliveryById('c2-r1');
    expect(updatedDelivery?.oneOffDeliveries?.[0]?.date).toBe(expectedDeliveryDate);
    expect(updatedDelivery?.oneOffDeliveries?.[0]?.donation?.date).toBe(expectedDeliveryDate);

    const deliveries = await storage.getAllDeliveries();
    const importState = buildImportState(deliveries);
    const totalsMap = (backup as any).computeTotalsByBase(
      deliveries,
      [],
      importState
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const csv = (backup as any).toCsvWithImportStateAndHistory(
      deliveries,
      importState,
      totalsMap,
      [],
      []
    ) as string;

    const parsed = Papa.parse(csv, { header: true });
    const rows = parsed.data as Record<string, string>[];
    const donationRow = rows.find(
      (row) =>
        row['RowType'] === 'OneOffDonation' && row['RunBaseRowId'] === 'c1'
    );
    const deliveryRow = rows.find(
      (row) =>
        row['RowType'] === 'OneOffDelivery' && row['RunBaseRowId'] === 'c2'
    );

    expect(donationRow?.['EventDate']).toBe(expectedDonationDate);
    expect(donationRow?.['RunTaxableAmount']).toBe('8.00');
    expect(deliveryRow?.['EventDate']).toBe(expectedDeliveryDate);
  });
});
