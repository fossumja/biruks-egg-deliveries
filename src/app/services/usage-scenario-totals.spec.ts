import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { BackupService } from './backup.service';
import { createStorageWithMiniRoute } from '../../testing/test-db.utils';
import Papa from 'papaparse';

/**
 * Usage-oriented totals tests
 *
 * These are small, data-level tests that mirror some of the
 * scenarios described in USAGE-SCENARIO-TESTS.md, focusing on
 * TotalDonation / TotalDozens behavior.
 */

describe('Usage scenario totals (data-level)', () => {
  let storage: StorageService;
  let backup: BackupService;

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
    const expectedTaxable = 0; // all donations match suggested in this scenario

    aliceRows.forEach((row) => {
      const totalDonation = parseFloat(row.TotalDonation);
      const totalDozens = parseInt(row.TotalDozens, 10);
      const totalTaxable = parseFloat(row.TotalTaxableDonation);
      expect(totalDonation).toBeCloseTo(expectedDonation, 5);
      expect(totalDozens).toBe(expectedDozens);
      expect(totalTaxable).toBeCloseTo(expectedTaxable, 5);
    });
  });
});
