import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { BackupService } from './backup.service';
import { createStorageWithMiniRoute } from '../../testing/test-db.utils';
import {
  ScenarioContext,
  addOneOffDelivery,
  addOneOffDonation,
  deliverStop,
  snapshotCurrentState
} from '../../testing/scenario-runner';

/**
 * Scenario runner spec
 *
 * This groups together higher-level usage scenarios using the
 * scenario runner helpers defined in src/testing/scenario-runner.ts.
 */

describe('Usage scenarios (scenario runner)', () => {
  let storage: StorageService;
  let backup: BackupService;
  let ctx: ScenarioContext;

  const runScenario = async (): Promise<Awaited<ReturnType<typeof snapshotCurrentState>>[]> => {
    const rate = storage.getSuggestedRate();

    await deliverStop(ctx, 'c1-r1', {
      dozens: 2,
      donation: {
        status: 'Donated',
        method: 'cash',
        amount: 2 * rate,
        suggestedAmount: 2 * rate
      },
      eventDate: '2025-01-01T08:00:00.000Z'
    });
    await deliverStop(ctx, 'c2-r1', {
      dozens: 1,
      donation: {
        status: 'Donated',
        method: 'cash',
        amount: 1 * rate,
        suggestedAmount: 1 * rate
      },
      eventDate: '2025-01-01T08:15:00.000Z'
    });

    const run1 = await snapshotCurrentState(ctx, 'run1-baseline');

    await addOneOffDonation(
      ctx,
      'c1-r1',
      {
        status: 'Donated',
        method: 'venmo',
        amount: 5,
        suggestedAmount: 5
      },
      '2025-01-03T12:00:00.000Z'
    );
    await addOneOffDelivery(
      ctx,
      'c1-r1',
      1,
      {
        status: 'Donated',
        method: 'other',
        amount: 3,
        suggestedAmount: 3
      },
      '2025-01-04T12:00:00.000Z'
    );
    await addOneOffDonation(
      ctx,
      'c2-r1',
      {
        status: 'Donated',
        method: 'ach',
        amount: 4,
        suggestedAmount: 4
      },
      '2025-01-05T12:00:00.000Z'
    );

    const between = await snapshotCurrentState(ctx, 'between-run1-and-run2');

    await deliverStop(ctx, 'c1-r2', {
      dozens: 3,
      donation: {
        status: 'Donated',
        method: 'ach',
        amount: 3 * rate,
        suggestedAmount: 3 * rate
      },
      eventDate: '2025-01-08T08:00:00.000Z'
    });
    await deliverStop(ctx, 'c2-r2', {
      dozens: 2,
      donation: {
        status: 'Donated',
        method: 'paypal',
        amount: 2 * rate,
        suggestedAmount: 2 * rate
      },
      eventDate: '2025-01-08T08:15:00.000Z'
    });

    const afterRun2 = await snapshotCurrentState(ctx, 'after-run2');

    return [run1, between, afterRun2];
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [StorageService, BackupService]
    }).compileComponents();

    storage = await createStorageWithMiniRoute();
    backup = TestBed.inject(BackupService);
    ctx = { storage, backup };
  });

  it('Multi-run scenario matches expected cumulative totals (Scenario 7 core)', async () => {
    const rate = storage.getSuggestedRate();
    const snapshots = await runScenario();

    const [run1, between, afterRun2] = snapshots;

    // After Run 1 baseline:
    // c1: delivered 2 dozen with 2*rate donation
    // c2: delivered 1 dozen with 1*rate donation
    const c1Run1 = run1.totals.get('c1')!;
    const c2Run1 = run1.totals.get('c2')!;
    expect(c1Run1.donation).toBeCloseTo(2 * rate, 5);
    expect(c1Run1.dozens).toBe(2);
    expect(c2Run1.donation).toBeCloseTo(1 * rate, 5);
    expect(c2Run1.dozens).toBe(1);

    // Between runs:
    // c1: +5 (one-off donation) +3 (one-off delivery donation), +1 dozen
    // c2: +4 (one-off donation)
    const c1Between = between.totals.get('c1')!;
    const c2Between = between.totals.get('c2')!;
    expect(c1Between.donation).toBeCloseTo(2 * rate + 5 + 3, 5);
    expect(c1Between.dozens).toBe(2 + 1);
    expect(c2Between.donation).toBeCloseTo(1 * rate + 4, 5);
    expect(c2Between.dozens).toBe(1);

    // After Run 2:
    // c1: additional 3 dozen, +3*rate donation
    // c2: additional 2 dozen, +2*rate donation
    const c1After = afterRun2.totals.get('c1')!;
    const c2After = afterRun2.totals.get('c2')!;
    const expectedC1Donation = 2 * rate + 5 + 3 + 3 * rate;
    const expectedC1Dozens = 2 + 1 + 3;
    const expectedC2Donation = 1 * rate + 4 + 2 * rate;
    const expectedC2Dozens = 1 + 2;

    expect(c1After.donation).toBeCloseTo(expectedC1Donation, 5);
    expect(c1After.dozens).toBe(expectedC1Dozens);
    expect(c2After.donation).toBeCloseTo(expectedC2Donation, 5);
    expect(c2After.dozens).toBe(expectedC2Dozens);
  });

  it('debug: logs multi-run snapshots and CSV rows', async () => {
    const snapshots = await runScenario();

    snapshots.forEach((snap) => {
      // Log label and totals per baseRowId
      // eslint-disable-next-line no-console
      console.log(`\n=== Snapshot: ${snap.label} ===`);
      snap.totals.forEach((val, baseRowId) => {
        // eslint-disable-next-line no-console
        console.log(
          `baseRowId=${baseRowId} donation=${val.donation.toFixed(
            2
          )} dozens=${val.dozens}`
        );
      });
      // Log CSV rows for quick inspection
      // eslint-disable-next-line no-console
      console.log('CSV rows:', JSON.stringify(snap.csvRows, null, 2));
    });

    // Ensure Jasmine sees at least one expectation for this debug spec
    expect(snapshots.length).toBeGreaterThan(0);
  });
});
