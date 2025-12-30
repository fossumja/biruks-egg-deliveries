import { Delivery } from '../../app/models/delivery.model';

// Very small, synthetic dataset for scenario-based tests.
// Two base customers, each with two runs.
export function miniRouteFixture(): Delivery[] {
  const now = '2025-01-01T00:00:00.000Z';
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
    const routeDate = overrides.routeDate ?? base.routeDate;
    const runId = overrides.runId ?? routeDate;
    const baseRowId = overrides.baseRowId ?? overrides.id ?? 'unknown';
    const id = overrides.id ?? `${baseRowId}-${runId}`;
    return {
      ...base,
      ...overrides,
      id,
      runId,
      baseRowId,
      routeDate
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
    }),
    // Schedule B (separate run series) with one-off history and an unsubscribe.
    mk({
      id: 'c3-r1',
      baseRowId: 'c3',
      name: 'Carla',
      routeDate: '2025-02-01',
      runId: '2025-02-01',
      week: 'ScheduleB',
      deliveryOrder: 0,
      sortIndex: 0,
      dozens: 3,
      oneOffDonations: [
        {
          status: 'Donated',
          method: 'cash',
          amount: 6,
          suggestedAmount: 6,
          date: '2025-02-03T12:00:00.000Z'
        }
      ]
    }),
    mk({
      id: 'c3-r2',
      baseRowId: 'c3',
      name: 'Carla',
      routeDate: '2025-02-08',
      runId: '2025-02-08',
      week: 'ScheduleB',
      deliveryOrder: 0,
      sortIndex: 0,
      dozens: 3
    }),
    mk({
      id: 'c4-r1',
      baseRowId: 'c4',
      name: 'Devin',
      routeDate: '2025-02-01',
      runId: '2025-02-01',
      week: 'ScheduleB',
      deliveryOrder: 1,
      sortIndex: 1,
      dozens: 1,
      status: 'skipped',
      subscribed: false,
      skippedReason: 'Unsubscribed',
      skippedAt: '2025-02-01T12:00:00.000Z'
    })
  ];
}
