import { Delivery } from '../../app/models/delivery.model';

// Very small, synthetic dataset for scenario-based tests.
// Two base customers, each with two runs.
export function miniRouteFixture(): Delivery[] {
  const now = new Date().toISOString();
  const base: Omit<Delivery, 'id' | 'runId' | 'baseRowId'> = {
    week: 'ScheduleA',
    routeDate: '2025-01-01',
    name: '',
    address: '123 Main St',
    city: 'Testville',
    state: 'TS',
    zip: '12345',
    dozens: 2,
    originalDozens: 2,
    deliveredDozens: undefined,
    deliveryOrder: 0,
    subscribed: true,
    notes: '',
    sortIndex: 0,
    status: '',
    donation: undefined,
    originalDonation: undefined,
    oneOffDonations: [],
    oneOffDeliveries: [],
    deliveredAt: undefined,
    skippedAt: undefined,
    skippedReason: undefined,
    createdAt: now,
    updatedAt: now,
    synced: false
  };

  const mk = (overrides: Partial<Delivery>): Delivery => {
    const id = overrides.id ?? `${Math.random()}`;
    const runId = overrides.runId ?? base.routeDate;
    const baseRowId = overrides.baseRowId ?? id;
    return {
      ...base,
      ...overrides,
      id,
      runId,
      baseRowId
    };
  };

  return [
    // Customer 1, Run 1
    mk({
      id: 'c1-r1',
      baseRowId: 'c1',
      name: 'Alice',
      routeDate: '2025-01-01',
      runId: '2025-01-01',
      deliveryOrder: 0,
      sortIndex: 0,
      dozens: 2
    }),
    // Customer 1, Run 2
    mk({
      id: 'c1-r2',
      baseRowId: 'c1',
      name: 'Alice',
      routeDate: '2025-01-08',
      runId: '2025-01-08',
      deliveryOrder: 0,
      sortIndex: 0,
      dozens: 2
    }),
    // Customer 2, Run 1
    mk({
      id: 'c2-r1',
      baseRowId: 'c2',
      name: 'Bob',
      routeDate: '2025-01-01',
      runId: '2025-01-01',
      deliveryOrder: 1,
      sortIndex: 1,
      dozens: 1
    }),
    // Customer 2, Run 2
    mk({
      id: 'c2-r2',
      baseRowId: 'c2',
      name: 'Bob',
      routeDate: '2025-01-08',
      runId: '2025-01-08',
      deliveryOrder: 1,
      sortIndex: 1,
      dozens: 1
    })
  ];
}

