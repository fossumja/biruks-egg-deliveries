import { StorageService } from '../app/services/storage.service';
import { BackupService } from '../app/services/backup.service';
import Papa from 'papaparse';

export interface ScenarioContext {
  storage: StorageService;
  backup: BackupService;
}

export interface ScenarioSnapshot {
  label: string;
  totals: Map<string, { donation: number; dozens: number }>;
  csvRows: any[];
}

// Utility: parse CSV to row objects
export function parseCsvRows(csv: string): any[] {
  const parsed = Papa.parse(csv, { header: true });
  return (parsed.data as any[]).filter((r) => Object.keys(r).length > 0);
}

// Utility: export current DB state to basic CSV rows and totals map
export async function snapshotCurrentState(
  ctx: ScenarioContext,
  label: string
): Promise<ScenarioSnapshot> {
  const deliveries = await ctx.storage.getAllDeliveries();
  const totals = (ctx.backup as any).computeTotalsByBase(
    deliveries
  ) as Map<string, { donation: number; dozens: number }>;
  const csv = (ctx.backup as any).toCsv(deliveries) as string;
  const rows = parseCsvRows(csv);
  return { label, totals, csvRows: rows };
}

// Scenario 7-style multi-run with interleaved one-offs, on the mini-route fixture.
export async function runMultiRunScenario(ctx: ScenarioContext): Promise<ScenarioSnapshot[]> {
  const { storage } = ctx;
  const snapshots: ScenarioSnapshot[] = [];
  const rate = storage.getSuggestedRate();

  // RUN 1: deliver c1-r1 and c2-r1 with simple donations
  await storage.markDelivered('c1-r1', 2);
  await storage.updateDonation('c1-r1', {
    status: 'Donated',
    method: 'cash',
    amount: 2 * rate,
    suggestedAmount: 2 * rate
  });

  await storage.markDelivered('c2-r1', 1);
  await storage.updateDonation('c2-r1', {
    status: 'Donated',
    method: 'cash',
    amount: 1 * rate,
    suggestedAmount: 1 * rate
  });

  snapshots.push(await snapshotCurrentState(ctx, 'run1-baseline'));

  // Between Run 1 and 2: one-off donations and deliveries
  await storage.appendOneOffDonation('c1-r1', {
    status: 'Donated',
    method: 'venmo',
    amount: 5,
    suggestedAmount: 5
  });
  await storage.appendOneOffDelivery('c1-r1', 1, {
    status: 'Donated',
    method: 'other',
    amount: 3,
    suggestedAmount: 3
  });

  await storage.appendOneOffDonation('c2-r1', {
    status: 'Donated',
    method: 'ach',
    amount: 4,
    suggestedAmount: 4
  });

  snapshots.push(await snapshotCurrentState(ctx, 'between-run1-and-run2'));

  // RUN 2: deliver c1-r2 and c2-r2 with different donations and quantities
  await storage.markDelivered('c1-r2', 3);
  await storage.updateDonation('c1-r2', {
    status: 'Donated',
    method: 'ach',
    amount: 3 * rate,
    suggestedAmount: 3 * rate
  });

  await storage.markDelivered('c2-r2', 2);
  await storage.updateDonation('c2-r2', {
    status: 'Donated',
    method: 'paypal',
    amount: 2 * rate,
    suggestedAmount: 2 * rate
  });

  snapshots.push(await snapshotCurrentState(ctx, 'after-run2'));

  // Additional between-run actions: extra one-offs and unsubscribes could be added here
  // as the scenario runner expands. For now, keep focused on totals.

  return snapshots;
}

