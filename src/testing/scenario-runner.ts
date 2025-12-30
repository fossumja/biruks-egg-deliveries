import { StorageService } from '../app/services/storage.service';
import { BackupService } from '../app/services/backup.service';
import Papa from 'papaparse';
import {
  Delivery,
  DonationInfo,
  DonationMethod,
  DonationStatus
} from '../app/models/delivery.model';
import { RunSnapshotEntry } from '../app/models/run-snapshot-entry.model';
import { normalizeEventDate } from '../app/utils/date-utils';

export interface ScenarioContext {
  storage: StorageService;
  backup: BackupService;
}

export interface ScenarioTotals {
  donation: number;
  dozens: number;
  taxable: number;
}

export interface ScenarioSnapshot {
  label: string;
  totals: Map<string, ScenarioTotals>;
  csvRows: Record<string, string>[];
}

export interface DonationInput {
  status: DonationStatus;
  method?: DonationMethod;
  amount?: number;
  suggestedAmount?: number;
}

interface BackupServiceTestAccess {
  computeTotalsByBase: (
    deliveries: Delivery[],
    runEntries?: RunSnapshotEntry[]
  ) => Map<string, ScenarioTotals>;
  toCsv: (deliveries: Delivery[], totalsMap: Map<string, ScenarioTotals>) => string;
}

const DEFAULT_EVENT_DATE = '2025-01-01T12:00:00.000Z';

const resolveEventDate = (raw?: string): string => {
  const normalized = normalizeEventDate(raw ?? DEFAULT_EVENT_DATE);
  return normalized ?? DEFAULT_EVENT_DATE;
};

const computeTaxableAmount = (suggested: number, amount: number): number => {
  const extra = amount - suggested;
  return extra > 0 ? extra : 0;
};

const buildDonation = (
  input: DonationInput | undefined,
  suggestedAmount: number,
  eventDate: string
): DonationInfo => {
  const status = input?.status ?? 'NotRecorded';
  const suggested = input?.suggestedAmount ?? suggestedAmount;
  const donation: DonationInfo = {
    status,
    suggestedAmount: suggested,
    date: eventDate
  };

  if (status === 'Donated') {
    const amount = Number(input?.amount ?? input?.suggestedAmount ?? suggested);
    donation.method = input?.method;
    donation.amount = amount;
    donation.taxableAmount = computeTaxableAmount(suggested, amount);
  } else if (status === 'NoDonation') {
    donation.amount = 0;
    donation.taxableAmount = 0;
  } else {
    donation.taxableAmount = 0;
  }

  return donation;
};

const buildOneOffDonation = (
  input: DonationInput,
  eventDate: string
): DonationInfo => {
  const suggested = input.suggestedAmount ?? input.amount ?? 0;
  return {
    status: input.status,
    method: input.method,
    amount:
      input.status === 'Donated'
        ? input.amount ?? suggested
        : input.status === 'NoDonation'
          ? 0
          : undefined,
    suggestedAmount: suggested,
    date: eventDate
  };
};

const buildOneOffDeliveryDonation = (
  input: DonationInput | undefined,
  suggestedAmount: number,
  eventDate: string
): DonationInfo => {
  if (!input) {
    return {
      status: 'NotRecorded',
      suggestedAmount,
      date: eventDate
    };
  }

  const suggested = input.suggestedAmount ?? suggestedAmount;
  return {
    status: input.status,
    method: input.method,
    amount:
      input.status === 'Donated'
        ? input.amount ?? suggested
        : input.status === 'NoDonation'
          ? 0
          : undefined,
    suggestedAmount: suggested,
    date: eventDate
  };
};

export function parseCsvRows(csv: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true
  });
  return (parsed.data ?? []).filter((row) =>
    Object.values(row).some((value) => String(value ?? '').trim() !== '')
  );
}

export async function snapshotCurrentState(
  ctx: ScenarioContext,
  label: string
): Promise<ScenarioSnapshot> {
  const deliveries = await ctx.storage.getAllDeliveries();
  const runEntries = await ctx.storage.getAllRunEntries();
  const backupAccess = ctx.backup as unknown as BackupServiceTestAccess;
  const totals = backupAccess.computeTotalsByBase(
    deliveries,
    runEntries
  ) as Map<string, ScenarioTotals>;
  const csv = backupAccess.toCsv(deliveries, totals);
  const rows = parseCsvRows(csv);
  return { label, totals, csvRows: rows };
}

export async function deliverStop(
  ctx: ScenarioContext,
  deliveryId: string,
  options: { dozens: number; donation?: DonationInput; eventDate?: string }
): Promise<void> {
  const eventDate = resolveEventDate(options.eventDate);
  const suggested = options.dozens * ctx.storage.getSuggestedRate();
  const donation = buildDonation(options.donation, suggested, eventDate);

  await ctx.storage.updateDeliveryFields(deliveryId, {
    status: 'delivered',
    deliveredDozens: options.dozens,
    deliveredAt: eventDate,
    donation
  });
}

export async function skipStop(
  ctx: ScenarioContext,
  deliveryId: string,
  options?: { reason?: string; eventDate?: string }
): Promise<void> {
  const eventDate = resolveEventDate(options?.eventDate);
  await ctx.storage.updateDeliveryFields(deliveryId, {
    status: 'skipped',
    skippedReason: options?.reason ?? 'Not home',
    skippedAt: eventDate,
    deliveredAt: undefined,
    deliveredDozens: undefined
  });
}

export async function addOneOffDonation(
  ctx: ScenarioContext,
  deliveryId: string,
  donation: DonationInput,
  eventDate?: string
): Promise<void> {
  const normalizedDate = resolveEventDate(eventDate);
  await ctx.storage.appendOneOffDonation(
    deliveryId,
    buildOneOffDonation(donation, normalizedDate)
  );
}

export async function addOneOffDelivery(
  ctx: ScenarioContext,
  deliveryId: string,
  dozens: number,
  donation: DonationInput | undefined,
  eventDate?: string
): Promise<void> {
  const normalizedDate = resolveEventDate(eventDate);
  const suggested = dozens * ctx.storage.getSuggestedRate();
  await ctx.storage.appendOneOffDelivery(
    deliveryId,
    dozens,
    buildOneOffDeliveryDonation(donation, suggested, normalizedDate)
  );
}

export async function unsubscribeStop(
  ctx: ScenarioContext,
  deliveryId: string,
  eventDate?: string
): Promise<void> {
  const normalizedDate = resolveEventDate(eventDate);
  await ctx.storage.updateDeliveryFields(deliveryId, {
    subscribed: false,
    status: 'skipped',
    skippedReason: 'Unsubscribed',
    skippedAt: normalizedDate,
    deliveredAt: undefined,
    deliveredDozens: undefined
  });
}

export async function resubscribeStop(
  ctx: ScenarioContext,
  deliveryId: string
): Promise<void> {
  await ctx.storage.updateDeliveryFields(deliveryId, {
    subscribed: true,
    status: '',
    skippedReason: undefined,
    skippedAt: undefined,
    deliveredAt: undefined,
    deliveredDozens: undefined
  });
}

export async function reorderRoute(
  ctx: ScenarioContext,
  routeDate: string,
  orderedIds: string[]
): Promise<void> {
  const deliveries = await ctx.storage.getDeliveriesByRoute(routeDate);
  const byId = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((delivery): delivery is Delivery => Boolean(delivery));
  const remaining = deliveries.filter((delivery) => !orderedIds.includes(delivery.id));
  await ctx.storage.saveSortOrder([...ordered, ...remaining]);
}

export async function runMultiRunScenario(
  ctx: ScenarioContext
): Promise<ScenarioSnapshot[]> {
  const snapshots: ScenarioSnapshot[] = [];
  const rate = ctx.storage.getSuggestedRate();

  // RUN 1: deliver c1-r1 and c2-r1 with simple donations
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

  snapshots.push(await snapshotCurrentState(ctx, 'run1-baseline'));

  // Between Run 1 and 2: one-off donations and deliveries
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

  snapshots.push(await snapshotCurrentState(ctx, 'between-run1-and-run2'));

  // RUN 2: deliver c1-r2 and c2-r2 with different donations and quantities
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

  snapshots.push(await snapshotCurrentState(ctx, 'after-run2'));

  return snapshots;
}
