import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HomeComponent } from './home.component';
import { StorageService } from '../services/storage.service';
import { BackupService } from '../services/backup.service';
import { BuildInfoService } from '../services/build-info.service';
import { ToastService } from '../services/toast.service';
import { normalizeEventDate } from '../utils/date-utils';
import { Delivery } from '../models/delivery.model';
import { DeliveryRun } from '../models/delivery-run.model';
import { Route } from '../models/route.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';
import {
  addOneOffDelivery,
  addOneOffDonation,
  deliverStop
} from '../../testing/scenario-runner';
import { miniRouteFixture } from '../../testing/fixtures/mini-route.fixture';
import {
  buildBackupCsvFile,
  buildBackupDeliveryRow,
  buildBackupOneOffDonationRow,
  buildBackupOneOffDeliveryRow,
  buildBackupRunEntryRow
} from '../../testing/fixtures/csv-fixture-builder';

const createRoute = (routeDate: string): Route => ({
  routeDate,
  totalStops: 0,
  deliveredCount: 0,
  skippedCount: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  lastUpdatedAt: '2025-01-01T00:00:00.000Z',
});

const createDelivery = (overrides: Partial<Delivery> = {}): Delivery => ({
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
  ...overrides,
});

const buildImportState = (deliveries: Delivery[]) => {
  const headers = [
    'Schedule',
    'BaseRowId',
    'Name',
    'Address',
    'City',
    'State',
    'ZIP',
    'Dozens',
    'Delivery Order'
  ];
  const rowsByBaseRowId: Record<string, string[]> = {};
  deliveries.forEach((delivery) => {
    if (!rowsByBaseRowId[delivery.baseRowId]) {
      rowsByBaseRowId[delivery.baseRowId] = [
        delivery.routeDate,
        delivery.baseRowId,
        delivery.name,
        delivery.address,
        delivery.city,
        delivery.state,
        delivery.zip ?? '',
        String(delivery.dozens ?? ''),
        String(delivery.deliveryOrder ?? '')
      ];
    }
  });
  return {
    headers,
    rowsByBaseRowId,
    mode: 'baseline' as const
  };
};

class StorageServiceStub {
  routes: Route[] = [createRoute('Week A')];
  deliveries: Delivery[] = [];
  runEntries: RunSnapshotEntry[] = [];
  runs: DeliveryRun[] = [];
  suggestedRate = 4;

  getSuggestedRate(): number {
    return this.suggestedRate;
  }

  setSuggestedRate(value: number): void {
    this.suggestedRate = value;
    localStorage.setItem('suggestedDonationRate', value.toString());
  }

  async importDeliveries(_deliveries: Delivery[]): Promise<void> {}

  async getRoutes(): Promise<Route[]> {
    return this.routes;
  }

  async getAllDeliveries(): Promise<Delivery[]> {
    return this.deliveries;
  }

  async getAllRunEntries(): Promise<RunSnapshotEntry[]> {
    return this.runEntries;
  }

  async getAllRuns(): Promise<DeliveryRun[]> {
    return this.runs;
  }

  async getDeliveriesByRoute(routeDate: string): Promise<Delivery[]> {
    return this.deliveries.filter((delivery) => delivery.routeDate === routeDate);
  }
}

class BackupServiceStub {
  async exportAll(_taxYear?: number): Promise<void> {
    localStorage.setItem('lastBackupAt', '2025-01-05T00:00:00.000Z');
  }
}

class BuildInfoServiceStub {
  async load(): Promise<null> {
    return null;
  }
}

class ToastServiceStub {
  messages: string[] = [];

  show(message: string): void {
    this.messages.push(message);
  }
}

describe('HomeComponent restore', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let storage: StorageService;
  let backup: BackupService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    storage = TestBed.inject(StorageService);
    backup = TestBed.inject(BackupService);
    await storage.clearAll();
  });

  afterEach(async () => {
    await storage.clearAll();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('restores one-off rows with normalized EventDate values', async () => {
    const rows = [
      buildBackupDeliveryRow(),
      buildBackupOneOffDonationRow({ EventDate: '2025-06-15' }),
      buildBackupOneOffDeliveryRow({ EventDate: '45123' })
    ];
    const file = buildBackupCsvFile(rows);

    await (component as any).restoreFromBackupFile(file);

    const deliveries = await storage.getAllDeliveries();
    const restored = deliveries.find((delivery) => delivery.baseRowId === 'c1');
    const expectedDonationDate = normalizeEventDate('2025-06-15');
    const expectedDeliveryDate = normalizeEventDate('45123');
    expect(expectedDonationDate).toBeTruthy();
    expect(expectedDeliveryDate).toBeTruthy();
    expect(restored?.oneOffDonations?.[0]?.date).toBe(expectedDonationDate);
    expect(restored?.oneOffDeliveries?.[0]?.date).toBe(expectedDeliveryDate);
    expect(restored?.oneOffDeliveries?.[0]?.donation?.date).toBe(
      expectedDeliveryDate
    );
  });

  it('falls back to route or run dates when EventDate is missing', async () => {
    const rows = [
      buildBackupDeliveryRow(),
      buildBackupOneOffDonationRow({ EventDate: '' }),
      buildBackupOneOffDeliveryRow({
        EventDate: '',
        RunDozens: '1',
        RunDonationAmount: '4',
        SuggestedAmount: '4'
      }),
      buildBackupRunEntryRow({ EventDate: '' })
    ];
    const file = buildBackupCsvFile(rows);

    await (component as any).restoreFromBackupFile(file);

    const deliveries = await storage.getAllDeliveries();
    const restored = deliveries.find((delivery) => delivery.baseRowId === 'c1');
    const fallbackDate = normalizeEventDate('2025-01-01');
    expect(fallbackDate).toBeTruthy();
    expect(restored?.oneOffDonations?.[0]?.date).toBe(fallbackDate);
    expect(restored?.oneOffDeliveries?.[0]?.date).toBe(fallbackDate);
    expect(restored?.oneOffDeliveries?.[0]?.donation?.date).toBe(fallbackDate);

    const runEntries = await storage.getAllRunEntries();
    expect(runEntries.length).toBe(1);
    const expectedRunDate = normalizeEventDate('2025-01-02');
    expect(expectedRunDate).toBeTruthy();
    expect(runEntries[0].eventDate).toBe(expectedRunDate);
  });

  it('recomputes totals from restored receipts', async () => {
    const rows = [
      buildBackupDeliveryRow(),
      buildBackupRunEntryRow(),
      buildBackupOneOffDonationRow({
        EventDate: '2025-02-01',
        RunDonationAmount: '5',
        SuggestedAmount: '5'
      }),
      buildBackupOneOffDeliveryRow({
        EventDate: '2025-03-01',
        RunDozens: '1',
        RunDonationMethod: 'venmo',
        RunDonationAmount: '4',
        SuggestedAmount: '4'
      })
    ];
    const file = buildBackupCsvFile(rows);

    await (component as any).restoreFromBackupFile(file);

    const deliveries = await storage.getAllDeliveries();
    const runEntries = await storage.getAllRunEntries();
    const totals = (backup as any).computeTotalsByBase(
      deliveries,
      runEntries
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;

    const c1Totals = totals.get('c1');
    expect(c1Totals).toBeDefined();
    expect(c1Totals?.donation ?? 0).toBeCloseTo(17, 5);
    expect(c1Totals?.dozens ?? 0).toBe(3);
    expect(c1Totals?.taxable ?? 0).toBeCloseTo(5, 5);
  });

  it('round-trips totals across backup export and restore', async () => {
    const ctx = { storage, backup };
    const rate = storage.getSuggestedRate();

    await storage.importDeliveries(miniRouteFixture());

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

    await storage.completeRun('2025-01-01', false);

    const deliveriesBefore = await storage.getAllDeliveries();
    const runEntriesBefore = await storage.getAllRunEntries();
    const runsBefore = await storage.getAllRuns();
    const importState = buildImportState(deliveriesBefore);
    const backupAccess = backup as any;
    const totalsBefore = backupAccess.computeTotalsByBase(
      deliveriesBefore,
      runEntriesBefore,
      importState
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;
    const csv = backupAccess.toCsvWithImportStateAndHistory(
      deliveriesBefore,
      importState,
      totalsBefore,
      runsBefore,
      runEntriesBefore
    );

    const file = new File([csv], 'backup.csv', { type: 'text/csv' });
    await (component as any).restoreFromBackupFile(file);

    const deliveriesAfter = await storage.getAllDeliveries();
    const runEntriesAfter = await storage.getAllRunEntries();
    const totalsAfter = backupAccess.computeTotalsByBase(
      deliveriesAfter,
      runEntriesAfter
    ) as Map<string, { donation: number; dozens: number; taxable: number }>;

    const baseRowId =
      deliveriesBefore.find((delivery) => delivery.id === 'c1-r1')?.baseRowId ??
      deliveriesBefore.find((delivery) => delivery.id === 'c1-r1')?.id;
    expect(baseRowId).toBeDefined();

    const beforeC1 = totalsBefore.get(baseRowId as string);
    const afterBaseRowId =
      deliveriesAfter.find((delivery) => delivery.baseRowId === baseRowId)
        ?.baseRowId ?? baseRowId;
    const afterC1 = totalsAfter.get(afterBaseRowId as string);
    expect(beforeC1).toBeDefined();
    expect(afterC1).toBeDefined();
    expect(afterC1!.donation).toBeCloseTo(beforeC1!.donation, 5);
    expect(afterC1!.dozens).toBe(beforeC1!.dozens);
    expect(afterC1!.taxable).toBeCloseTo(beforeC1!.taxable, 5);
  });
});

describe('HomeComponent core actions', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let storage: StorageServiceStub;
  let backupService: BackupServiceStub;
  let originalWakeLock: unknown;
  let hadWakeLock = false;

  beforeEach(async () => {
    localStorage.clear();
    hadWakeLock = 'wakeLock' in navigator;
    originalWakeLock = (navigator as any).wakeLock;
    Object.defineProperty(navigator as any, 'wakeLock', {
      value: {
        request: jasmine.createSpy().and.resolveTo({
          release: jasmine.createSpy().and.returnValue(Promise.resolve()),
          addEventListener: jasmine.createSpy()
        })
      },
      configurable: true
    });

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
      providers: [
        { provide: StorageService, useClass: StorageServiceStub },
        { provide: BackupService, useClass: BackupServiceStub },
        { provide: BuildInfoService, useClass: BuildInfoServiceStub },
        { provide: ToastService, useClass: ToastServiceStub }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    storage = TestBed.inject(StorageService) as unknown as StorageServiceStub;
    backupService = TestBed.inject(BackupService) as BackupServiceStub;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    if (hadWakeLock) {
      Object.defineProperty(navigator as any, 'wakeLock', {
        value: originalWakeLock,
        configurable: true
      });
    } else {
      delete (navigator as any).wakeLock;
    }
  });

  it('imports deliveries and updates timestamps', async () => {
    localStorage.setItem('lastBackupAt', '2025-01-01T00:00:00.000Z');
    const parseSpy = spyOn(component as any, 'parseCsv').and.resolveTo([
      createDelivery()
    ]);
    const importSpy = spyOn(storage, 'importDeliveries').and.resolveTo();
    const refreshRoutesSpy = spyOn(component as any, 'refreshRoutes').and.resolveTo();
    const refreshTaxSpy = spyOn(component as any, 'refreshTaxYearOptions').and.resolveTo();
    const autoSpy = spyOn(component as any, 'autoselectRoute');

    const file = new File(['data'], 'input.csv', { type: 'text/csv' });
    const input = { files: [file], value: 'input.csv' } as unknown as HTMLInputElement;

    await component.onFileSelected({ target: input } as unknown as Event);

    expect(parseSpy).toHaveBeenCalled();
    expect(importSpy).toHaveBeenCalled();
    expect(localStorage.getItem('lastImportSource')).toBe('user');
    expect(localStorage.getItem('lastImportAt')).toBeTruthy();
    expect(localStorage.getItem('lastBackupAt')).toBeNull();
    expect(component.lastImportAt).toBeTruthy();
    expect(component.lastBackupAt).toBeUndefined();
    expect(refreshRoutesSpy).toHaveBeenCalled();
    expect(refreshTaxSpy).toHaveBeenCalled();
    expect(autoSpy).toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('exports using the selected tax year and updates lastBackupAt', async () => {
    const exportSpy = spyOn(backupService, 'exportAll').and.callThrough();
    component.selectedTaxYear = 2024;

    await component.exportCsv();

    expect(exportSpy).toHaveBeenCalledWith(2024);
    expect(component.lastBackupAt).toBe('2025-01-05T00:00:00.000Z');
  });

  it('persists tax year selection', () => {
    const select = document.createElement('select');
    const option = document.createElement('option');
    option.value = '2023';
    option.textContent = '2023';
    select.appendChild(option);
    select.value = '2023';

    component.onTaxYearChange({ target: select } as unknown as Event);

    expect(component.selectedTaxYear).toBe(2023);
    expect(localStorage.getItem('selectedTaxYear')).toBe('2023');
  });

  it('gates restore with confirmation and refreshes routes on success', async () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
    const restoreSpy = spyOn(component as any, 'restoreFromBackupFile').and.resolveTo();
    const refreshRoutesSpy = spyOn(component as any, 'refreshRoutes').and.resolveTo();
    const refreshTaxSpy = spyOn(component as any, 'refreshTaxYearOptions').and.resolveTo();

    localStorage.setItem('currentRoute', 'Week A');
    component.currentRoute = 'Week A';

    const file = new File(['data'], 'backup.csv', { type: 'text/csv' });
    const input = { files: [file], value: 'backup.csv' } as unknown as HTMLInputElement;

    await component.onRestoreSelected({ target: input } as unknown as Event);

    expect(confirmSpy).toHaveBeenCalled();
    expect(restoreSpy).toHaveBeenCalledWith(file);
    expect(refreshRoutesSpy).toHaveBeenCalled();
    expect(refreshTaxSpy).toHaveBeenCalled();
    expect(localStorage.getItem('currentRoute')).toBeNull();
    expect(component.currentRoute).toBeUndefined();
    expect(input.value).toBe('');
  });

  it('abandons restore when confirmation is declined', async () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    const restoreSpy = spyOn(component as any, 'restoreFromBackupFile').and.resolveTo();

    const file = new File(['data'], 'backup.csv', { type: 'text/csv' });
    const input = { files: [file], value: 'backup.csv' } as unknown as HTMLInputElement;

    await component.onRestoreSelected({ target: input } as unknown as Event);

    expect(confirmSpy).toHaveBeenCalled();
    expect(restoreSpy).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('updates suggested rate and persists to storage', () => {
    component.suggestedRate = 4;
    const setSpy = spyOn(storage, 'setSuggestedRate').and.callThrough();

    component.changeSuggested(2);

    expect(component.suggestedRate).toBe(6);
    expect(setSpy).toHaveBeenCalledWith(6);
    expect(localStorage.getItem('suggestedDonationRate')).toBe('6');
  });

  it('toggles dark mode and updates document and localStorage', () => {
    component.darkModeEnabled = true;
    component.toggleDarkMode();

    expect(component.darkModeEnabled).toBeFalse();
    expect(localStorage.getItem('darkModeEnabled')).toBe('false');
    expect(document.documentElement.hasAttribute('data-theme')).toBeFalse();

    component.toggleDarkMode();

    expect(component.darkModeEnabled).toBeTrue();
    expect(localStorage.getItem('darkModeEnabled')).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles wake lock and updates localStorage', async () => {
    component.wakeLockSupported = true;
    component.wakeLockActive = false;

    await component.toggleWakeLock();

    expect(component.wakeLockActive).toBeTrue();
    expect(localStorage.getItem('keepScreenAwake')).toBe('true');

    await component.toggleWakeLock();

    expect(component.wakeLockActive).toBeFalse();
    expect(localStorage.getItem('keepScreenAwake')).toBe('false');
  });

  it('toggles the help overlay', () => {
    component.showHelp = false;
    component.toggleHelp();
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.help-overlay');
    expect(component.showHelp).toBeTrue();
    expect(overlay).toBeTruthy();
  });

  it('shows the multi-year warning when data spans years', async () => {
    storage.deliveries = [
      createDelivery({
        id: 'delivery-2024',
        baseRowId: 'base-2024',
        status: 'delivered',
        deliveredAt: '2024-06-01T00:00:00.000Z'
      }),
      createDelivery({
        id: 'delivery-2025',
        baseRowId: 'base-2025',
        status: 'delivered',
        deliveredAt: '2025-06-01T00:00:00.000Z'
      })
    ];

    await (component as any).refreshTaxYearOptions();
    fixture.detectChanges();

    expect(component.hasMultiYearData).toBeTrue();
    const warning = fixture.nativeElement.querySelector('.tax-year-warning');
    expect(warning).toBeTruthy();
  });
});
