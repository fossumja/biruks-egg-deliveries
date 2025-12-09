import { TestBed } from '@angular/core/testing';
import { BackupService } from './backup.service';
import { StorageService } from './storage.service';
import { createStorageWithMiniRoute } from '../../testing/test-db.utils';

// NOTE: These are initial data-level tests focused on totals.
// They simulate a very small subset of the usage scenarios,
// and assert that TotalDonation and TotalDozens are computed correctly.

describe('BackupService totals with mini route', () => {
  let backup: BackupService;
  let storage: StorageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [StorageService, BackupService]
    }).compileComponents();

    storage = await createStorageWithMiniRoute();
    backup = TestBed.inject(BackupService);
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
});
