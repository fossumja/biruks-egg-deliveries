import { Delivery } from '../app/models/delivery.model';
import { Route } from '../app/models/route.model';
import { RunSnapshotEntry } from '../app/models/run-snapshot-entry.model';

/**
 * Usage examples:
 *   const stop = createDelivery({ id: 'stop-1' });
 *   const { event } = buildFileInputEvent(new File(['data'], 'input.csv'));
 *   const restoreClipboard = stubClipboard({ writeText: jasmine.createSpy() });
 *   clearLocalStorage();
 */

export const createDelivery = (overrides: Partial<Delivery> = {}): Delivery => ({
  id: 'delivery-1',
  runId: 'Week A',
  baseRowId: 'base-1',
  routeDate: 'Week A',
  name: 'Customer',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip: '00000',
  dozens: 2,
  deliveryOrder: 0,
  sortIndex: 0,
  status: '',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides
});

export const createStop = (overrides: Partial<Delivery> = {}): Delivery =>
  createDelivery(overrides);

export const buildUnsubscribedDelivery = (
  overrides: Partial<Delivery> = {}
): Delivery =>
  createDelivery({
    subscribed: false,
    status: 'skipped',
    skippedReason: 'Unsubscribed',
    skippedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  });

export const createRoute = (routeDate: string, overrides: Partial<Route> = {}): Route => ({
  routeDate,
  totalStops: 0,
  deliveredCount: 0,
  skippedCount: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  lastUpdatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides
});

export const createRunEntry = (
  overrides: Partial<RunSnapshotEntry> = {}
): RunSnapshotEntry => ({
  id: 'entry-1',
  runId: 'run-1',
  baseRowId: 'base-1',
  name: 'Customer',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  status: 'delivered',
  dozens: 2,
  deliveryOrder: 0,
  donationStatus: 'Donated',
  donationMethod: 'cash',
  donationAmount: 8,
  taxableAmount: 0,
  eventDate: '2025-01-05',
  ...overrides
});

export const buildAddress = (delivery: {
  address: string;
  city: string;
  state: string;
  zip?: string;
}): string =>
  `${delivery.address}, ${delivery.city}, ${delivery.state} ${delivery.zip ?? ''}`.trim();

export const createPointerEvent = (
  clientX: number,
  clientY: number
): PointerEvent =>
  ({
    clientX,
    clientY,
    preventDefault: jasmine.createSpy('preventDefault')
  } as unknown as PointerEvent);

export const stubClipboard = (
  clipboard: { writeText: (text: string) => Promise<void> } | undefined
): (() => void) => {
  const navigatorClipboard = navigator as unknown as {
    clipboard?: { writeText: (text: string) => Promise<void> };
  };
  const hadClipboard = 'clipboard' in navigator;
  const originalClipboard = navigatorClipboard.clipboard;

  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true
  });

  return () => {
    if (hadClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true
      });
    } else {
      delete navigatorClipboard.clipboard;
    }
  };
};

export const clearLocalStorage = (): void => {
  localStorage.clear();
};

export const setLocalStorageItems = (items: Record<string, string>): void => {
  Object.entries(items).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
};

export const buildFileInputEvent = (
  files: File[] | File,
  value?: string
): { input: HTMLInputElement; event: Event } => {
  const list = Array.isArray(files) ? files : [files];
  const inputValue = value ?? list[0]?.name ?? '';
  const input = { files: list, value: inputValue } as unknown as HTMLInputElement;
  const event = { target: input } as unknown as Event;
  return { input, event };
};
