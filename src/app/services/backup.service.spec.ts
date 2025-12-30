import { TestBed } from '@angular/core/testing';
import { BackupService } from './backup.service';
import { StorageService } from './storage.service';
import { createStorageWithMiniRoute } from '../../testing/test-db.utils';
import Papa from 'papaparse';

// NOTE: These are initial data-level tests focused on totals.
// They simulate a very small subset of the usage scenarios,
// and assert that TotalDonation and TotalDozens are computed correctly.

describe('BackupService totals with mini route', () => {
  let backup: BackupService;
  let storage: StorageService;

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

  afterEach(() => {
    localStorage.removeItem('lastImportAt');
  });

  it('computes zero totals when nothing has been delivered or donated', async () => {
    const deliveries = await storage.getAllDeliveries();
    const totals = (backup as any).computeTotalsByBase(deliveries);
    expect(totals.get('c1')?.donation ?? 0).toBe(0);
    expect(totals.get('c1')?.dozens ?? 0).toBe(0);
    expect(totals.get('c2')?.donation ?? 0).toBe(0);
    expect(totals.get('c2')?.dozens ?? 0).toBe(0);
  });

  it('accumulates run donations/dozens and one-off entries per baseRowId', async () => {
    // Arrange: mark one run delivered with a donation, and add one-off donation + delivery
    const rate = storage.getSuggestedRate();

    // For customer c1, run 1: delivered 2 dozen, donated cash $rate * 2
    const donationForRun = {
      status: 'Donated' as const,
      method: 'cash' as const,
      amount: 2 * rate,
      suggestedAmount: 2 * rate
    };
    await storage.markDelivered('c1-r1', 2);
    await storage.updateDonation('c1-r1', donationForRun);

    // One-off donation (no dozens)
    const oneOffDonation = {
      status: 'Donated' as const,
      method: 'venmo' as const,
      amount: 10,
      suggestedAmount: 10
    };
    await storage.appendOneOffDonation('c1-r1', oneOffDonation);

    // One-off delivery: 3 dozen with a $15 donation
    const oneOffDeliveryDonation = {
      status: 'Donated' as const,
      method: 'ach' as const,
      amount: 15,
      suggestedAmount: 15
    };
    await storage.appendOneOffDelivery('c1-r1', 3, oneOffDeliveryDonation);

    const deliveries = await storage.getAllDeliveries();
    const totals = (backup as any).computeTotalsByBase(deliveries) as Map<
      string,
      { donation: number; dozens: number; taxable: number }
    >;

    const c1Totals = totals.get('c1');
    expect(c1Totals).toBeDefined();
    // Donation = run donation (2*rate) + 10 + 15
    expect(c1Totals!.donation).toBeCloseTo(2 * rate + 10 + 15, 5);
    // Dozens = run delivered (2) + one-off delivery (3)
    expect(c1Totals!.dozens).toBe(2 + 3);
    // Global deductible contribution = totalDonation - baselineValue.
    // Baseline counts only deliveries (2*rate + 3*rate), so the extra $10
    // one-off donation is fully deductible.
    const expectedDeductible = 10;
    expect(c1Totals!.taxable).toBeCloseTo(expectedDeductible, 5);
  });

  it('filters totals by tax year across runs, one-offs, and live deliveries', async () => {
    const rate = storage.getSuggestedRate();
    const deliveries = await storage.getAllDeliveries();
    const target = deliveries.find((d) => d.id === 'c1-r1');
    if (!target) {
      throw new Error('Missing delivery c1-r1');
    }

    target.status = 'delivered';
    target.deliveredDozens = 2;
    target.dozens = 2;
    target.deliveredAt = '2025-04-10T12:00:00.000Z';
    target.donation = {
      status: 'Donated',
      method: 'cash',
      amount: 2 * rate,
      suggestedAmount: 2 * rate,
      taxableAmount: 0,
      date: target.deliveredAt
    };
    target.oneOffDonations = [
      {
        status: 'Donated',
        method: 'venmo',
        amount: 5,
        suggestedAmount: 5,
        date: '2025-02-01'
      }
    ];
    target.oneOffDeliveries = [
      {
        deliveredDozens: 1,
        donation: {
          status: 'Donated',
          method: 'cash',
          amount: 4,
          suggestedAmount: 4,
          date: '2025-03-01'
        },
        date: '2025-03-01'
      }
    ];

    const runEntries = [
      {
        id: 'run-2024-c1',
        runId: '2024-06-01_2024-06-01T00:00:00.000Z',
        baseRowId: 'c1',
        name: 'Alice',
        address: '123 Main St',
        city: 'Testville',
        state: 'TS',
        zip: '12345',
        status: 'delivered' as const,
        dozens: 1,
        deliveryOrder: 0,
        donationStatus: 'Donated' as const,
        donationMethod: 'cash' as const,
        donationAmount: 6,
        taxableAmount: 0,
        eventDate: '2024-06-15T12:00:00.000Z'
      }
    ];

    const totals2024 = (backup as any).computeTotalsByBase(
      deliveries,
      runEntries,
      undefined,
      2024
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const c1Totals2024 = totals2024.get('c1');
    expect(c1Totals2024?.donation ?? 0).toBeCloseTo(6, 5);
    expect(c1Totals2024?.dozens ?? 0).toBe(1);
    expect(c1Totals2024?.taxable ?? 0).toBeCloseTo(0, 5);

    const totals2025 = (backup as any).computeTotalsByBase(
      deliveries,
      runEntries,
      undefined,
      2025
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const c1Totals2025 = totals2025.get('c1');
    const expected2025Donation = 2 * rate + 5 + 4;
    expect(c1Totals2025?.donation ?? 0).toBeCloseTo(expected2025Donation, 5);
    expect(c1Totals2025?.dozens ?? 0).toBe(3);
    expect(c1Totals2025?.taxable ?? 0).toBeCloseTo(5, 5);

    const totalsAll = (backup as any).computeTotalsByBase(
      deliveries,
      runEntries
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const c1TotalsAll = totalsAll.get('c1');
    expect(c1TotalsAll?.donation ?? 0).toBeCloseTo(
      expected2025Donation + 6,
      5
    );
    expect(c1TotalsAll?.dozens ?? 0).toBe(4);
  });

  it('includes import totals only for the baseline year when filtered', async () => {
    localStorage.setItem('lastImportAt', '2024-05-01T00:00:00.000Z');
    const deliveries = await storage.getAllDeliveries();
    const importState = {
      headers: [
        'BaseRowId',
        'TotalDonation',
        'TotalDozens',
        'TotalDeductibleContribution'
      ],
      rowsByBaseRowId: {
        c1: ['c1', '20', '4', '6']
      },
      mode: 'baseline' as const
    };

    const totals2024 = (backup as any).computeTotalsByBase(
      deliveries,
      [],
      importState,
      2024
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const c1Totals2024 = totals2024.get('c1');
    expect(c1Totals2024?.donation ?? 0).toBe(20);
    expect(c1Totals2024?.dozens ?? 0).toBe(4);
    expect(c1Totals2024?.taxable ?? 0).toBe(6);

    const totals2025 = (backup as any).computeTotalsByBase(
      deliveries,
      [],
      importState,
      2025
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const c1Totals2025 = totals2025.get('c1');
    expect(c1Totals2025?.donation ?? 0).toBe(0);
    expect(c1Totals2025?.dozens ?? 0).toBe(0);
    expect(c1Totals2025?.taxable ?? 0).toBe(0);
  });

  it('exports history CSV with RowType and run metadata columns', async () => {
    const rate = storage.getSuggestedRate();
    await storage.markDelivered('c1-r1', 2);
    await storage.updateDonation('c1-r1', {
      status: 'Donated',
      method: 'cash',
      amount: 2 * rate,
      suggestedAmount: 2 * rate
    });
    await storage.markSkipped('c2-r1', 'Not home');
    await storage.completeRun('2025-01-01', false);

    const deliveries = await storage.getAllDeliveries();
    const importState = buildImportState(deliveries);
    const runEntries = await storage.getAllRunEntries();
    const runs = await storage.getAllRuns();
    const totals = (backup as any).computeTotalsByBase(
      deliveries,
      runEntries,
      importState
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const csv = (backup as any).toCsvWithImportStateAndHistory(
      deliveries,
      importState,
      totals,
      runs,
      runEntries
    ) as string;

    const parsed = Papa.parse(csv, { header: true });
    const headers = parsed.meta.fields ?? [];
    expect(headers).toContain('RowType');
    expect(headers).toContain('RunId');
    expect(headers).toContain('RunBaseRowId');
    expect(headers).toContain('RunEntryStatus');
    expect(headers).toContain('EventDate');
    expect(headers).toContain('SuggestedAmount');
  });

  it('exports totals that include runs and one-offs', async () => {
    const rate = storage.getSuggestedRate();
    await storage.markDelivered('c1-r1', 2);
    await storage.updateDonation('c1-r1', {
      status: 'Donated',
      method: 'cash',
      amount: 2 * rate,
      suggestedAmount: 2 * rate
    });
    await storage.markSkipped('c2-r1', 'Not home');
    await storage.completeRun('2025-01-01', false);

    await storage.appendOneOffDonation('c1-r1', {
      status: 'Donated',
      method: 'venmo',
      amount: 5,
      suggestedAmount: 5
    });
    await storage.appendOneOffDelivery('c1-r1', 1, {
      status: 'Donated',
      method: 'ach',
      amount: rate,
      suggestedAmount: rate
    });

    const deliveries = await storage.getAllDeliveries();
    const importState = buildImportState(deliveries);
    const runEntries = await storage.getAllRunEntries();
    const runs = await storage.getAllRuns();
    const totals = (backup as any).computeTotalsByBase(
      deliveries,
      runEntries,
      importState
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const csv = (backup as any).toCsvWithImportStateAndHistory(
      deliveries,
      importState,
      totals,
      runs,
      runEntries
    ) as string;

    const parsed = Papa.parse(csv, { header: true });
    const rows = parsed.data as Record<string, string>[];
    const c1Row = rows.find(
      (row) => row['RowType'] === 'Delivery' && row['BaseRowId'] === 'c1'
    );
    const expectedDonation = 2 * rate + 5 + rate;
    const expectedDozens = 3;
    const expectedDeductible = 5;

    expect(c1Row?.['TotalDonation']).toBe(expectedDonation.toFixed(2));
    expect(c1Row?.['TotalDozens']).toBe(expectedDozens.toString());
    expect(c1Row?.['TotalDeductibleContribution']).toBe(
      expectedDeductible.toFixed(2)
    );
  });
});
