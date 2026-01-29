import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RoutePlannerComponent } from './route-planner.component';
import { StorageService } from '../services/storage.service';
import { BackupService } from '../services/backup.service';
import { ToastService } from '../services/toast.service';
import { ReceiptHistoryEntry } from '../models/receipt-history-entry.model';
import { Delivery, DonationInfo } from '../models/delivery.model';
import { Route } from '../models/route.model';
import { DeliveryRun } from '../models/delivery-run.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';
import { toSortableTimestamp } from '../utils/date-utils';
import {
  buildAddress,
  createDelivery,
  createPointerEvent,
  createRoute,
  createRunEntry,
  stubClipboard
} from '../../testing/spec-helpers';

type OneOffDonationUpdate = {
  donationStatus: DonationInfo['status'];
  donationMethod?: DonationInfo['method'];
  donationAmount: number;
  suggestedAmount?: number;
  date?: string;
};

type OneOffDeliveryUpdate = OneOffDonationUpdate & {
  dozens: number;
};

class StorageServiceStub {
  deliveries: Delivery[] = [];
  runEntries: RunSnapshotEntry[] = [];
  runs: DeliveryRun[] = [];
  routes: Route[] = [];
  receiptHistoryByBase: Record<string, ReceiptHistoryEntry[]> = {};
  suggestedRate = 4;
  private nextDeliveryId = 1;

  getSuggestedRate(): number {
    return this.suggestedRate;
  }

  computeChangeStatus(_stop: Delivery): Delivery['status'] {
    return '';
  }

  getReceiptHistoryByBaseRowId(
    baseRowId: string,
    _taxYear?: number
  ): Promise<ReceiptHistoryEntry[]> {
    return Promise.resolve(this.receiptHistoryByBase[baseRowId] ?? []);
  }

  getRoutes(): Promise<Route[]> {
    return Promise.resolve(this.routes);
  }

  getRunsForSchedule(_scheduleId: string): Promise<DeliveryRun[]> {
    return Promise.resolve(this.runs);
  }

  getAllRuns(): Promise<DeliveryRun[]> {
    return Promise.resolve(this.runs);
  }

  getAllDeliveries(): Promise<Delivery[]> {
    return Promise.resolve(this.deliveries);
  }

  getDeliveriesByRoute(routeDate: string): Promise<Delivery[]> {
    return Promise.resolve(
      this.deliveries.filter((delivery) => delivery.routeDate === routeDate)
    );
  }

  getAllRunEntries(): Promise<RunSnapshotEntry[]> {
    return Promise.resolve(this.runEntries);
  }

  getRunEntries(runId: string): Promise<RunSnapshotEntry[]> {
    return Promise.resolve(
      this.runEntries.filter((entry) => entry.runId === runId)
    );
  }

  getImportState(_id: string): Promise<null> {
    return Promise.resolve(null);
  }

  getDeliveryById(id: string): Promise<Delivery | null> {
    return Promise.resolve(
      this.deliveries.find((delivery) => delivery.id === id) ?? null
    );
  }

  saveSortOrder(deliveries: Delivery[]): Promise<void> {
    this.deliveries = deliveries.map((delivery) => ({ ...delivery }));
    return Promise.resolve();
  }

  addDelivery(routeDate: string, delivery: Partial<Delivery>): Promise<void> {
    const nextIndex = this.deliveries.filter(
      (item) => item.routeDate === routeDate
    ).length;
    const id = `delivery-${this.nextDeliveryId++}`;
    const baseRowId = delivery.baseRowId ?? `base-${id}`;
    const newDelivery: Delivery = {
      id,
      runId: routeDate,
      baseRowId,
      routeDate,
      name: delivery.name ?? '',
      address: delivery.address ?? '',
      city: delivery.city ?? '',
      state: delivery.state ?? '',
      zip: delivery.zip,
      dozens: Number(delivery.dozens ?? 0),
      deliveryOrder: delivery.deliveryOrder ?? nextIndex,
      sortIndex: delivery.sortIndex ?? nextIndex,
      status: '',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      notes: delivery.notes ?? '',
    };
    this.deliveries.push(newDelivery);
    return Promise.resolve();
  }

  appendOneOffDonation(id: string, donation: DonationInfo): Promise<void> {
    const delivery = this.deliveries.find((item) => item.id === id);
    if (!delivery) return Promise.resolve();
    const list = delivery.oneOffDonations
      ? [...delivery.oneOffDonations]
      : [];
    list.push({ ...donation });
    delivery.oneOffDonations = list;
    return Promise.resolve();
  }

  appendOneOffDelivery(
    id: string,
    dozens: number,
    donation: DonationInfo
  ): Promise<void> {
    const delivery = this.deliveries.find((item) => item.id === id);
    if (!delivery) return Promise.resolve();
    const list = delivery.oneOffDeliveries
      ? [...delivery.oneOffDeliveries]
      : [];
    list.push({
      deliveredDozens: dozens,
      donation: { ...donation },
      date: donation.date ?? '',
    });
    delivery.oneOffDeliveries = list;
    return Promise.resolve();
  }

  updateOneOffDonationByIndex(
    id: string,
    index: number,
    update: OneOffDonationUpdate
  ): Promise<void> {
    const delivery = this.deliveries.find((item) => item.id === id);
    const current = delivery?.oneOffDonations?.[index];
    if (!delivery || !current) return Promise.resolve();
    const next: DonationInfo = {
      ...current,
      status: update.donationStatus,
      method: update.donationMethod,
      amount: update.donationAmount,
      suggestedAmount: update.suggestedAmount ?? current.suggestedAmount,
      date: update.date ?? current.date,
    };
    const list = delivery.oneOffDonations ? [...delivery.oneOffDonations] : [];
    list[index] = next;
    delivery.oneOffDonations = list;
    return Promise.resolve();
  }

  updateOneOffDeliveryByIndex(
    id: string,
    index: number,
    update: OneOffDeliveryUpdate
  ): Promise<void> {
    const delivery = this.deliveries.find((item) => item.id === id);
    const current = delivery?.oneOffDeliveries?.[index];
    if (!delivery || !current) return Promise.resolve();
    const currentDonation: DonationInfo = current.donation ?? {
      status: 'NoDonation',
      amount: 0,
    };
    const nextDonation: DonationInfo = {
      ...currentDonation,
      status: update.donationStatus,
      method: update.donationMethod,
      amount: update.donationAmount,
      suggestedAmount:
        update.suggestedAmount ?? currentDonation.suggestedAmount,
    };
    const list = delivery.oneOffDeliveries ? [...delivery.oneOffDeliveries] : [];
    list[index] = {
      ...current,
      deliveredDozens: update.dozens,
      donation: nextDonation,
      date: update.date ?? current.date,
    };
    delivery.oneOffDeliveries = list;
    return Promise.resolve();
  }

  updateRunEntry(id: string, update: Partial<RunSnapshotEntry>): Promise<void> {
    const entry = this.runEntries.find((item) => item.id === id);
    if (entry) {
      Object.assign(entry, update);
    }
    return Promise.resolve();
  }

  saveRunEntryOrdering(_runId: string, entries: RunSnapshotEntry[]): Promise<void> {
    this.runEntries = entries.map((entry) => ({ ...entry }));
    return Promise.resolve();
  }

  deleteRunEntry(id: string): Promise<void> {
    this.runEntries = this.runEntries.filter((entry) => entry.id !== id);
    return Promise.resolve();
  }

  deleteOneOffDonationByIndex(id: string, index: number): Promise<void> {
    const delivery = this.deliveries.find((item) => item.id === id);
    if (!delivery || !Array.isArray(delivery.oneOffDonations)) {
      return Promise.resolve();
    }
    const list = [...delivery.oneOffDonations];
    if (index < 0 || index >= list.length) return Promise.resolve();
    list.splice(index, 1);
    delivery.oneOffDonations = list;
    return Promise.resolve();
  }

  deleteOneOffDeliveryByIndex(id: string, index: number): Promise<void> {
    const delivery = this.deliveries.find((item) => item.id === id);
    if (!delivery || !Array.isArray(delivery.oneOffDeliveries)) {
      return Promise.resolve();
    }
    const list = [...delivery.oneOffDeliveries];
    if (index < 0 || index >= list.length) return Promise.resolve();
    list.splice(index, 1);
    delivery.oneOffDeliveries = list;
    return Promise.resolve();
  }

  updateDeliveryFields(id: string, updates: Partial<Delivery>): Promise<void> {
    const delivery = this.deliveries.find((item) => item.id === id);
    if (delivery) {
      Object.assign(delivery, updates);
    }
    return Promise.resolve();
  }

  updatePlannedDozens(id: string, dozens: number): Promise<void> {
    const delivery = this.deliveries.find((item) => item.id === id);
    if (delivery) {
      delivery.dozens = dozens;
    }
    return Promise.resolve();
  }
}

class BackupServiceStub {
  computeTotalsByBase(
    _deliveries: Delivery[],
    _runEntries: RunSnapshotEntry[],
    _importState?: unknown
  ): Map<string, { donation: number; dozens: number; taxable: number; baseline?: number }> {
    return new Map();
  }
}

describe('RoutePlannerComponent', () => {
  let component: RoutePlannerComponent;
  let fixture: ComponentFixture<RoutePlannerComponent>;
  let storage: StorageServiceStub;
  let toast: ToastService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [RoutePlannerComponent, RouterTestingModule],
      providers: [
        { provide: StorageService, useClass: StorageServiceStub },
        { provide: BackupService, useClass: BackupServiceStub }
      ]
    })
    .compileComponents();

    storage = TestBed.inject(StorageService) as unknown as StorageServiceStub;
    storage.routes = [createRoute('Week A')];
    storage.receiptHistoryByBase = {
      'base-1': [
        {
          kind: 'run',
          date: '2025-12-20T12:00:00.000Z',
          status: 'delivered',
          dozens: 2,
          donationStatus: 'Donated',
          donationMethod: 'cash',
          donationAmount: 8,
          taxableAmount: 0,
          runEntryId: 'run-entry-1',
          runId: 'run-1',
        },
        {
          kind: 'run',
          date: '2025-10-12T12:00:00.000Z',
          status: 'skipped',
          dozens: 0,
          donationStatus: 'NotRecorded',
          donationAmount: 0,
          taxableAmount: 0,
          runEntryId: 'run-entry-2',
          runId: 'run-1',
        }
      ]
    };

    fixture = TestBed.createComponent(RoutePlannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    toast = TestBed.inject(ToastService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders receipt history when opening the one-off donation modal', async () => {
    const stop = createDelivery({
      id: 'delivery-1',
      baseRowId: 'base-1',
      name: 'Customer 1',
    });

    component.deliveries = [stop];
    component.filteredDeliveries = [stop];
    fixture.detectChanges();

    component.openDonationDetails(stop);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const items = element.querySelectorAll('.receipt-history-item');
    expect(items.length).toBe(2);
    expect(items[0]?.textContent ?? '').toContain('Delivered');
    expect(items[1]?.textContent ?? '').toContain('Skipped');
  });

  it('shows delete action in receipt history list when identifiers exist', async () => {
    const stop = createDelivery({
      id: 'delivery-1',
      baseRowId: 'base-1',
      name: 'Customer 1',
    });
    storage.receiptHistoryByBase = {
      'base-1': [
        {
          kind: 'run',
          date: '2025-12-20T12:00:00.000Z',
          status: 'delivered',
          dozens: 2,
          donationStatus: 'Donated',
          donationMethod: 'cash',
          donationAmount: 8,
          taxableAmount: 0,
          runEntryId: 'run-entry-1',
          runId: 'run-1',
        }
      ]
    };

    component.deliveries = [stop];
    component.filteredDeliveries = [stop];
    fixture.detectChanges();

    component.openDonationDetails(stop);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const deleteButtons = fixture.nativeElement.querySelectorAll(
      '.receipt-history-action .receipt-delete-btn'
    );
    expect(deleteButtons.length).toBe(1);
  });

  it('deletes a receipt history entry via storage', async () => {
    const stop = createDelivery({
      id: 'delivery-1',
      baseRowId: 'base-1',
      name: 'Customer 1',
      oneOffDonations: [
        {
          status: 'Donated',
          method: 'cash',
          amount: 8,
          suggestedAmount: 8,
          date: '2025-12-20'
        }
      ]
    });
    component.donationModalStop = stop;
    storage.deliveries = [stop];
    const entry: ReceiptHistoryEntry = {
      kind: 'oneOffDonation',
      date: '2025-12-20',
      status: 'donation',
      dozens: 0,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 8,
      taxableAmount: 0,
      deliveryId: 'delivery-1',
      oneOffKind: 'donation',
      oneOffIndex: 0
    };

    spyOn(window, 'confirm').and.returnValue(true);
    const deleteSpy = spyOn(storage, 'deleteOneOffDonationByIndex').and.callThrough();
    const toastSpy = spyOn(toast, 'show');

    await component.confirmDeleteReceiptHistory(entry);

    expect(deleteSpy).toHaveBeenCalledWith('delivery-1', 0);
    expect(toastSpy).toHaveBeenCalledWith('Receipt deleted');
  });

  it('selects a route and loads deliveries', async () => {
    const first = createDelivery({
      id: 'delivery-1',
      baseRowId: 'base-1',
      name: 'Alpha',
      deliveryOrder: 0,
      sortIndex: 0,
    });
    const second = createDelivery({
      id: 'delivery-2',
      baseRowId: 'base-2',
      name: 'Beta',
      deliveryOrder: 1,
      sortIndex: 1,
    });

    storage.deliveries = [first, second];
    const fetchSpy = spyOn(storage, 'getDeliveriesByRoute').and.callThrough();

    await component.onRouteOrRunChange('route:Week A');

    expect(component.routeDate).toBe('Week A');
    expect(fetchSpy).toHaveBeenCalledWith('Week A');
    expect(component.deliveries.length).toBe(2);
  });

  it('resets search and inline edit state when switching routes', async () => {
    const alpha = createDelivery({
      id: 'delivery-1',
      baseRowId: 'base-1',
      routeDate: 'Week A',
      name: 'Alpha',
      deliveryOrder: 0,
      sortIndex: 0,
    });
    const beta = createDelivery({
      id: 'delivery-2',
      baseRowId: 'base-2',
      routeDate: 'Week A',
      name: 'Beta',
      deliveryOrder: 1,
      sortIndex: 1,
    });

    storage.deliveries = [alpha, beta];
    component.searchTerm = 'alp';
    component.filteredDeliveries = [alpha];
    component.editingStop = alpha;
    component.openRowId = alpha.id;

    await component.onRouteOrRunChange('route:Week A');

    expect(component.searchTerm).toBe('');
    expect(component.filteredDeliveries.length).toBe(2);
    expect(component.editingStop).toBeNull();
    expect(component.openRowId).toBeNull();
  });

  it('filters deliveries by search term and clears on toggle', () => {
    const alpha = createDelivery({ id: 'delivery-1', name: 'Alpha' });
    const beta = createDelivery({ id: 'delivery-2', name: 'Beta' });
    component.deliveries = [alpha, beta];
    component.filteredDeliveries = [alpha, beta];
    component.searchTerm = 'alp';

    component.applyFilter();

    expect(component.filteredDeliveries.map((d) => d.id)).toEqual(['delivery-1']);

    component.showSearch = true;
    component.toggleSearch();

    expect(component.searchTerm).toBe('');
    expect(component.filteredDeliveries.length).toBe(2);
  });

  it('toggles reorder and saves sort order on drop', async () => {
    component.reorderEnabled = false;
    component.toggleReorder();
    expect(component.reorderEnabled).toBeTrue();

    const first = createDelivery({ id: 'delivery-1', deliveryOrder: 0, sortIndex: 0 });
    const second = createDelivery({ id: 'delivery-2', deliveryOrder: 1, sortIndex: 1 });
    component.deliveries = [first, second];
    component.filteredDeliveries = [first, second];

    const saveSpy = spyOn(storage, 'saveSortOrder').and.callThrough();

    await component.drop({
      previousIndex: 0,
      currentIndex: 1
    } as CdkDragDrop<Delivery[]>);

    expect(component.deliveries[0].id).toBe('delivery-2');
    expect(component.deliveries[0].sortIndex).toBe(0);
    expect(saveSpy).toHaveBeenCalled();
  });

  it('opens a row when swiped left past the threshold', () => {
    const stop = createDelivery();
    const startEvent = createPointerEvent(100, 100);
    const moveEvent = createPointerEvent(50, 100);
    const endEvent = createPointerEvent(40, 100);

    component.startSwipe(startEvent, stop);
    component.moveSwipe(moveEvent, stop);
    component.endSwipe(endEvent, stop);

    expect(moveEvent.preventDefault).toHaveBeenCalled();
    expect(component.openRowId).toBe(stop.id);
    expect(component.isSwiping).toBeFalse();
  });

  it('keeps only one row open when swiping different stops', () => {
    const first = createDelivery({ id: 'delivery-1' });
    const second = createDelivery({ id: 'delivery-2' });

    component.startSwipe(createPointerEvent(100, 100), first);
    component.moveSwipe(createPointerEvent(40, 100), first);
    component.endSwipe(createPointerEvent(30, 100), first);

    expect(component.openRowId).toBe(first.id);

    component.startSwipe(createPointerEvent(100, 120), second);
    component.moveSwipe(createPointerEvent(40, 120), second);
    component.endSwipe(createPointerEvent(30, 120), second);

    expect(component.openRowId).toBe(second.id);
  });

  it('closes an open row when swiped right past the threshold', () => {
    const stop = createDelivery();
    component.openRowId = stop.id;
    const startEvent = createPointerEvent(100, 100);
    const moveEvent = createPointerEvent(160, 100);
    const endEvent = createPointerEvent(180, 100);

    component.startSwipe(startEvent, stop);
    component.moveSwipe(moveEvent, stop);
    component.endSwipe(endEvent, stop);

    expect(component.openRowId).toBeNull();
  });

  it('ignores toggleRow while a swipe gesture is active', () => {
    const stop = createDelivery();
    component.isSwiping = true;

    component.toggleRow(stop);

    expect(component.openRowId).toBeNull();
  });

  it('closes an open row when opening donation details', () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.openRowId = stop.id;

    component.openDonationDetails(stop);

    expect(component.openRowId).toBeNull();
  });

  it('closes an open row when opening an off-schedule delivery', () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.openRowId = stop.id;

    component.openOffScheduleDelivery(stop);

    expect(component.openRowId).toBeNull();
  });

  it('closes the open row when drag starts', () => {
    const stop = createDelivery();
    component.openRowId = stop.id;

    component.handleDragStart();

    expect(component.openRowId).toBeNull();
  });

  it('validates new delivery fields', () => {
    component.routeDate = 'Week A';
    component.newDelivery = {
      deliveryOrder: 0,
      routeDate: 'Week A',
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      dozens: 0,
      notes: '',
    };

    expect(component.canSaveNew).toBeFalse();
    expect(component.newDeliveryErrors).toContain('Name is required.');
    expect(component.newDeliveryErrors).toContain('Dozens must be greater than 0.');
    expect(component.newDeliveryErrors).toContain('Order must be at least 1.');
  });

  it('adds a new delivery when inputs are valid', async () => {
    component.routeDate = 'Week A';
    component.newDelivery = {
      deliveryOrder: 1,
      routeDate: 'Week A',
      name: 'New Stop',
      address: '12 Oak St',
      city: 'Springfield',
      state: 'IL',
      zip: '11111',
      dozens: 3,
      notes: '',
    };

    const addSpy = spyOn(storage, 'addDelivery').and.callThrough();

    await component.saveNewDelivery();

    expect(addSpy).toHaveBeenCalled();
    expect(component.deliveries.length).toBe(1);
    expect(component.deliveries[0]?.name).toBe('New Stop');
  });

  it('reorders deliveries when editing the order', async () => {
    const first = createDelivery({
      id: 'delivery-1',
      name: 'Alpha',
      deliveryOrder: 0,
      sortIndex: 0,
    });
    const second = createDelivery({
      id: 'delivery-2',
      name: 'Beta',
      deliveryOrder: 1,
      sortIndex: 1,
    });
    storage.deliveries = [first, second];
    component.deliveries = [first, second];
    component.filteredDeliveries = [first, second];

    component.openEdit(second);
    component.editDraft.deliveryOrder = 1;

    const updateSpy = spyOn(storage, 'updateDeliveryFields').and.callThrough();
    const saveSpy = spyOn(storage, 'saveSortOrder').and.callThrough();

    await component.saveEdit();

    expect(updateSpy).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
    expect(component.deliveries[0].id).toBe('delivery-2');
  });

  it('blocks one-off donation save when date is missing', () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.donationModalStop = stop;
    component.donationDraft = {
      ...stop,
      donation: {
        status: 'Donated',
        method: 'cash',
        amount: 8,
        suggestedAmount: 8,
        date: ''
      }
    };
    component.oneOffDonationDate = '';

    const appendSpy = spyOn(storage, 'appendOneOffDonation').and.callThrough();

    component.saveDonation();

    expect(component.oneOffDonationDateError).toBe('Date is required.');
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('blocks one-off donation save when method is missing', () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.donationModalStop = stop;
    component.oneOffDateMin = '2025-01-01';
    component.oneOffDateMax = '2026-12-31';
    component.oneOffYearRangeLabel = '2025 and 2026';
    component.oneOffDonationDate = '2025-06-15';
    component.donationDraft = {
      ...stop,
      donation: {
        status: 'Donated',
        amount: 8,
        suggestedAmount: 8,
        date: '2025-06-15'
      }
    };

    const appendSpy = spyOn(storage, 'appendOneOffDonation').and.callThrough();

    component.saveDonation();

    expect(component.oneOffDonationTypeError)
      .toBe('Select a donation method before saving.');
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('applies one-off date bounds to the donation date input', () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.deliveries = [stop];
    component.filteredDeliveries = [stop];
    component.donationModalStop = stop;
    component.donationDraft = {
      ...stop,
      donation: {
        status: 'Donated',
        method: 'cash',
        amount: 8,
        suggestedAmount: 8,
        date: '2025-06-15'
      }
    };
    component.oneOffDateMin = '2025-01-01';
    component.oneOffDateMax = '2026-12-31';
    component.oneOffDonationDate = '2025-06-15';

    fixture.detectChanges();

    const dateInput = fixture.nativeElement.querySelector(
      'input[name="oneOffDonationDate"]'
    ) as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    expect(dateInput.min).toBe('2025-01-01');
    expect(dateInput.max).toBe('2026-12-31');
  });

  it('keeps one-off donation status as NoDonation when amount is zero', () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.donationModalStop = stop;
    component.donationDraft = {
      ...stop,
      donation: {
        status: 'NoDonation',
        amount: 0,
        suggestedAmount: 8,
        date: '2025-06-15'
      }
    };
    component.oneOffDonationDate = '2025-06-15';

    component.onDonationAmountChange(0);

    expect(component.donationDraft?.donation?.status).toBe('NoDonation');
    expect(component.donationDraft?.donation?.amount).toBe(0);
  });

  it('blocks one-off delivery save when date is missing', async () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.offScheduleStop = stop;
    component.offDonationDraft = {
      status: 'Donated',
      amount: 8,
      suggestedAmount: 8,
      date: ''
    };
    component.oneOffDeliveryDate = '';

    const appendSpy = spyOn(storage, 'appendOneOffDelivery').and.callThrough();

    await component.saveOffSchedule();

    expect(component.oneOffDeliveryDateError).toBe('Date is required.');
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('blocks one-off delivery save when method is missing', async () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.offScheduleStop = stop;
    component.oneOffDateMin = '2025-01-01';
    component.oneOffDateMax = '2026-12-31';
    component.oneOffYearRangeLabel = '2025 and 2026';
    component.oneOffDeliveryDate = '2025-06-15';
    component.offDonationDraft = {
      status: 'Donated',
      amount: 8,
      suggestedAmount: 8,
      date: '2025-06-15'
    };

    const appendSpy = spyOn(storage, 'appendOneOffDelivery').and.callThrough();

    await component.saveOffSchedule();

    expect(component.oneOffDeliveryTypeError)
      .toBe('Select a donation method before saving.');
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('applies one-off date bounds to the delivery date input', () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.deliveries = [stop];
    component.filteredDeliveries = [stop];
    component.offScheduleStop = stop;
    component.offDonationDraft = {
      status: 'Donated',
      method: 'cash',
      amount: 8,
      suggestedAmount: 8,
      date: '2025-06-15'
    };
    component.oneOffDateMin = '2025-01-01';
    component.oneOffDateMax = '2026-12-31';
    component.oneOffDeliveryDate = '2025-06-15';

    fixture.detectChanges();

    const dateInput = fixture.nativeElement.querySelector(
      'input[name="oneOffDeliveryDate"]'
    ) as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    expect(dateInput.min).toBe('2025-01-01');
    expect(dateInput.max).toBe('2026-12-31');
  });

  it('allows one-off delivery save when donation status is NoDonation', async () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.routeDate = 'Week A';
    storage.deliveries = [stop];
    component.offScheduleStop = stop;
    component.oneOffDateMin = '2025-01-01';
    component.oneOffDateMax = '2026-12-31';
    component.oneOffYearRangeLabel = '2025 and 2026';
    component.oneOffDeliveryDate = '2025-06-15';
    component.offDonationDraft = {
      status: 'NoDonation',
      amount: 0,
      suggestedAmount: 8,
      date: '2025-06-15'
    };

    const appendSpy = spyOn(storage, 'appendOneOffDelivery').and.callThrough();

    await component.saveOffSchedule();

    expect(component.oneOffDeliveryTypeError).toBe('');
    expect(appendSpy).toHaveBeenCalled();
  });

  it('keeps one-off delivery status as NoDonation when amount is zero', () => {
    const stop = createDelivery({ id: 'delivery-1', baseRowId: 'base-1' });
    component.offScheduleStop = stop;
    component.oneOffDeliveryDate = '2025-06-15';
    component.offDonationDraft = {
      status: 'NoDonation',
      amount: 0,
      suggestedAmount: 8,
      date: '2025-06-15'
    };

    component.onOffAmountChange(0);

    expect(component.offDonationDraft.status).toBe('NoDonation');
    expect(component.offDonationDraft.amount).toBe(0);
  });

  it('ties one-off date range to the selected tax year', async () => {
    localStorage.setItem('selectedTaxYear', '2030');
    localStorage.setItem('lastImportAt', '2024-01-05T00:00:00.000Z');
    storage.runs = [{
      id: 'run-1',
      date: '2023-02-01',
      weekType: 'Week A',
      label: 'Week A - 2023-02-01',
      routeDate: 'Week A'
    }];

    await (component as any).refreshOneOffDateRange();

    expect(component.oneOffDateMin).toBe('2023-01-01');
    expect(component.oneOffDateMax).toBe('2030-12-31');
    expect(component.oneOffYearRangeLabel).toBe('2023 and 2030');
  });

  it('sorts all receipts by event date descending', async () => {
    const run = {
      id: 'run-1',
      date: '2025-01-05',
      weekType: 'WeekA',
      label: 'Week A - 2025-01-05',
      routeDate: 'Week A',
    };
    const runEntry = createRunEntry({
      id: 'entry-1',
      runId: 'run-1',
      eventDate: '2025-01-05'
    });
    const delivery = createDelivery({
      id: 'delivery-1',
      baseRowId: 'base-1',
      oneOffDonations: [
        {
          status: 'Donated',
          method: 'cash',
          amount: 10,
          suggestedAmount: 8,
          date: '2025-01-10'
        }
      ]
    });

    storage.runs = [run];
    storage.runEntries = [runEntry];
    storage.deliveries = [delivery];

    await component.onRouteOrRunChange('receipts:all');

    const timestamps = component.runEntries.map((entry) =>
      toSortableTimestamp(entry.eventDate)
    );
    const sorted = [...timestamps].sort((a, b) => b - a);

    expect(timestamps).toEqual(sorted);
  });

  it('filters all receipts to the selected tax year', async () => {
    storage.runEntries = [
      createRunEntry({ id: 'entry-2025', eventDate: '2025-01-05' }),
      createRunEntry({ id: 'entry-2024', eventDate: '2024-12-20' })
    ];
    storage.deliveries = [
      createDelivery({
        id: 'delivery-1',
        baseRowId: 'base-1',
        oneOffDonations: [
          {
            status: 'Donated',
            method: 'cash',
            amount: 10,
            suggestedAmount: 8,
            date: '2025-02-01'
          },
          {
            status: 'Donated',
            method: 'cash',
            amount: 5,
            suggestedAmount: 4,
            date: '2024-02-01'
          }
        ]
      })
    ];

    localStorage.setItem('selectedTaxYear', '2025');

    await component.onRouteOrRunChange('receipts:all');

    const years = component.filteredRunEntries.map((entry) =>
      Number(entry.eventDate?.slice(0, 4))
    );
    expect(years.every((year) => year === 2025)).toBeTrue();
  });

  it('shows delete action in run history action row', () => {
    const entry = createRunEntry({
      id: 'entry-1',
      runId: 'run-1'
    });
    component.viewingRun = true;
    component.runEntries = [entry];
    component.filteredRunEntries = [entry];

    fixture.detectChanges();

    const deleteButtons = fixture.nativeElement.querySelectorAll(
      '.run-entry-actions .warn'
    );
    expect(deleteButtons.length).toBe(1);
  });

  it('deletes a run entry and refreshes the run list', async () => {
    const entry = createRunEntry({
      id: 'entry-1',
      runId: 'run-1'
    });
    storage.runEntries = [entry];
    storage.runs = [
      {
        id: 'run-1',
        date: '2025-01-05',
        weekType: 'WeekA',
        label: 'Week A - 2025-01-05',
        routeDate: 'Week A',
      }
    ];
    component.allRuns = storage.runs;
    component.viewingRun = true;
    component.viewingAllReceipts = false;
    component.selectedRunId = 'run-1';
    component.runEntries = [entry];
    component.filteredRunEntries = [entry];

    spyOn(window, 'confirm').and.returnValue(true);
    const deleteSpy = spyOn(storage, 'deleteRunEntry').and.callThrough();

    await component.confirmDeleteRunEntry(entry);

    expect(deleteSpy).toHaveBeenCalledWith('entry-1');
    expect(component.runEntries.length).toBe(0);
  });

  it('deletes a run entry from all receipts and refreshes the list', async () => {
    const entry = createRunEntry({
      id: 'entry-1',
      runId: 'run-1',
      eventDate: '2025-01-05'
    });
    storage.runEntries = [entry];
    storage.runs = [
      {
        id: 'run-1',
        date: '2025-01-05',
        weekType: 'WeekA',
        label: 'Week A - 2025-01-05',
        routeDate: 'Week A',
      }
    ];
    storage.deliveries = [];

    localStorage.setItem('selectedTaxYear', '2025');
    await component.onRouteOrRunChange('receipts:all');

    expect(component.runEntries.length).toBe(1);

    spyOn(window, 'confirm').and.returnValue(true);
    const deleteSpy = spyOn(storage, 'deleteRunEntry').and.callThrough();

    await component.confirmDeleteRunEntry(component.runEntries[0]!);

    expect(deleteSpy).toHaveBeenCalledWith('entry-1');
    expect(component.runEntries.length).toBe(0);
    expect(component.filteredRunEntries.length).toBe(0);
  });

  it('updates a one-off receipt date and refreshes ordering', async () => {
    const deliveryA = createDelivery({
      id: 'delivery-1',
      baseRowId: 'base-1',
      oneOffDeliveries: [
        {
          deliveredDozens: 2,
          date: '2025-01-02',
          donation: {
            status: 'Donated',
            method: 'cash',
            amount: 8,
            suggestedAmount: 8,
          }
        }
      ]
    });
    const deliveryB = createDelivery({
      id: 'delivery-2',
      baseRowId: 'base-2',
      oneOffDeliveries: [
        {
          deliveredDozens: 1,
          date: '2025-01-10',
          donation: {
            status: 'Donated',
            method: 'cash',
            amount: 4,
            suggestedAmount: 4,
          }
        }
      ]
    });

    storage.deliveries = [deliveryA, deliveryB];
    storage.runEntries = [];
    storage.runs = [];

    localStorage.setItem('selectedTaxYear', '2025');
    await component.onRouteOrRunChange('receipts:all');

    component.oneOffDateMin = '2025-01-01';
    component.oneOffDateMax = '2026-12-31';
    component.oneOffYearRangeLabel = '2025 and 2026';

    const entryToEdit = component.runEntries.find(
      (entry) => entry.deliveryId === 'delivery-1'
    );
    expect(entryToEdit).toBeTruthy();

    component.openRunEntryEdit(entryToEdit!);
    await fixture.whenStable();

    component.runEntryDraft = {
      status: 'delivered',
      dozens: 3,
      deliveryOrder: 1,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 12,
    };
    component.onRunEntryDateChange('2025-02-15');

    const updateSpy = spyOn(storage, 'updateOneOffDeliveryByIndex').and.callThrough();

    await component.saveRunEntryEdit();

    expect(updateSpy).toHaveBeenCalled();
    expect(component.runEntries[0].deliveryId).toBe('delivery-1');
  });

  it('disables receipt save when one-off date is invalid', () => {
    const entry = createRunEntry({
      id: 'entry-oneoff',
      runId: 'oneoff',
      deliveryId: 'delivery-1',
      oneOffKind: 'delivery',
      oneOffIndex: 0,
      eventDate: '2025-01-02'
    });
    component.viewingRun = true;
    component.runEntries = [entry];
    component.filteredRunEntries = [entry];
    component.editingRunEntry = entry;
    component.runEntryDraft = {
      status: 'delivered',
      dozens: 1,
      deliveryOrder: 1,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 4,
    };

    component.onRunEntryDateChange('');
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector(
      '.inline-donation .btn.btn-primary'
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBeTrue();
  });

  it('normalizes NotRecorded to NoDonation when editing a receipt', () => {
    const entry = createRunEntry({
      id: 'entry-legacy',
      runId: 'run-1',
      donationStatus: 'NotRecorded',
      donationMethod: 'cash',
      donationAmount: 12,
    });

    component.openRunEntryEdit(entry);

    expect(component.runEntryDraft?.donationStatus).toBe('NoDonation');
    expect(component.runEntryDraft?.donationMethod).toBe('');
    expect(component.runEntryDraft?.donationAmount).toBe(0);
  });

  it('renders a numeric donation amount input for receipt edits', () => {
    const entry = createRunEntry({
      id: 'entry-amount',
      runId: 'run-1'
    });
    component.loading = false;
    component.viewingRun = true;
    component.viewingAllReceipts = true;
    component.runEntries = [entry];
    component.filteredRunEntries = [entry];
    component.editingRunEntry = entry;
    component.runEntryDraft = {
      status: 'delivered',
      dozens: 1,
      deliveryOrder: 1,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 4,
    };

    fixture.detectChanges();

    const amountInput = fixture.nativeElement.querySelector(
      'input[name="runEntryDonationAmount"]'
    ) as HTMLInputElement;
    const amountSelect = fixture.nativeElement.querySelector(
      'select[name="runEntryDonationAmount"]'
    ) as HTMLSelectElement | null;

    expect(amountInput).toBeTruthy();
    expect(amountInput.type).toBe('number');
    expect(amountSelect).toBeNull();
  });

  it('accepts decimal donation amounts over 100 in receipt edits', () => {
    const entry = createRunEntry({
      id: 'entry-decimal',
      runId: 'run-1'
    });
    component.loading = false;
    component.viewingRun = true;
    component.viewingAllReceipts = true;
    component.runEntries = [entry];
    component.filteredRunEntries = [entry];
    component.editingRunEntry = entry;
    component.runEntryDraft = {
      status: 'delivered',
      dozens: 1,
      deliveryOrder: 1,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 4,
    };

    component.onRunEntryDonationAmountChange('125.75');
    fixture.detectChanges();

    expect(component.runEntryDraft?.donationAmount).toBeCloseTo(125.75, 2);
    expect(component.runEntryAmountError).toBe('');

    const saveButton = fixture.nativeElement.querySelector(
      '.inline-donation .btn.btn-primary'
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBeFalse();
  });

  it('clears receipt edit state when switching between run and all receipts', async () => {
    const run = {
      id: 'run-1',
      date: '2025-01-05',
      weekType: 'Week A',
      label: 'Week A - 2025-01-05',
      routeDate: 'Week A',
    };
    const entry = createRunEntry({
      id: 'entry-1',
      runId: 'run-1',
      eventDate: '2025-01-05'
    });
    storage.runs = [run];
    storage.runEntries = [entry];
    storage.deliveries = [];

    component.editingRunEntry = entry;
    component.runEntryDraft = {
      status: 'delivered',
      dozens: 1,
      deliveryOrder: 1,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 5,
    };

    await component.onRouteOrRunChange('receipts:all');

    expect(component.editingRunEntry).toBeNull();
    expect(component.runEntryDraft).toBeNull();
  });

  it('blocks receipt save when donated amount is missing', () => {
    const entry = createRunEntry({
      id: 'entry-missing-amount',
      runId: 'run-1'
    });
    component.loading = false;
    component.viewingRun = true;
    component.viewingAllReceipts = true;
    component.runEntries = [entry];
    component.filteredRunEntries = [entry];
    component.editingRunEntry = entry;
    component.runEntryDraft = {
      status: 'delivered',
      dozens: 1,
      deliveryOrder: 1,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 4,
    };

    component.onRunEntryDonationAmountChange('');
    fixture.detectChanges();

    expect(component.runEntryAmountError).toBe(
      'Donation amount is required when status is Donated.'
    );

    const saveButton = fixture.nativeElement.querySelector(
      '.inline-donation .btn.btn-primary'
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBeTrue();
  });

  it('blocks receipt save when donated amount exceeds the max', () => {
    const entry = createRunEntry({
      id: 'entry-max-amount',
      runId: 'run-1'
    });
    component.loading = false;
    component.viewingRun = true;
    component.viewingAllReceipts = true;
    component.runEntries = [entry];
    component.filteredRunEntries = [entry];
    component.editingRunEntry = entry;
    component.runEntryDraft = {
      status: 'delivered',
      dozens: 1,
      deliveryOrder: 1,
      donationStatus: 'Donated',
      donationMethod: 'cash',
      donationAmount: 4,
    };

    component.onRunEntryDonationAmountChange('100000');
    fixture.detectChanges();

    expect(component.runEntryAmountError).toBe(
      'Donation amount must be between $0 and $99999.'
    );

    const saveButton = fixture.nativeElement.querySelector(
      '.inline-donation .btn.btn-primary'
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBeTrue();
  });

  it('updates run entry without changing date fields', async () => {
    const entry = createRunEntry({
      id: 'entry-1',
      runId: 'run-1',
      eventDate: '2025-01-05'
    });
    component.viewingRun = true;
    component.viewingAllReceipts = true;
    component.runEntries = [entry];
    component.filteredRunEntries = [entry];
    component.editingRunEntry = entry;
    component.runEntryDraft = {
      status: 'skipped',
      dozens: 0,
      deliveryOrder: 1,
      donationStatus: 'NoDonation',
      donationMethod: '',
      donationAmount: 0,
    };

    const updateSpy = spyOn(storage, 'updateRunEntry').and.callThrough();

    await component.saveRunEntryEdit();

    const update = updateSpy.calls.mostRecent().args[1];
    expect(updateSpy).toHaveBeenCalled();
    expect('eventDate' in update).toBeFalse();
  });

  it('opens iOS maps deep link when user agent is iOS', () => {
    const stop = createDelivery();
    const assignSpy = spyOn(
      component as unknown as { navigateToUrl: (url: string) => void },
      'navigateToUrl'
    );
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('iPhone');

    component.openMaps(stop);

    expect(assignSpy).toHaveBeenCalledWith(
      `maps://?q=${encodeURIComponent(buildAddress(stop))}`
    );
  });

  it('opens Android maps deep link when user agent is Android', () => {
    const stop = createDelivery();
    const assignSpy = spyOn(
      component as unknown as { navigateToUrl: (url: string) => void },
      'navigateToUrl'
    );
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Android');

    component.openMaps(stop);

    expect(assignSpy).toHaveBeenCalledWith(
      `geo:0,0?q=${encodeURIComponent(buildAddress(stop))}`
    );
  });

  it('falls back to web maps when user agent is not mobile', () => {
    const stop = createDelivery();
    const assignSpy = spyOn(
      component as unknown as { navigateToUrl: (url: string) => void },
      'navigateToUrl'
    );
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Chrome');

    component.openMaps(stop);

    expect(assignSpy).toHaveBeenCalledWith(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buildAddress(stop))}`
    );
  });

  it('copies address using the clipboard API and shows a toast', async () => {
    const stop = createDelivery();
    const clipboardSpy = jasmine
      .createSpy('writeText')
      .and.callFake(() => Promise.resolve());
    const toastSpy = spyOn(toast, 'show');
    const restoreClipboard = stubClipboard({ writeText: clipboardSpy });

    try {
      await component.copyAddress(stop);
    } finally {
      restoreClipboard();
    }

    expect(clipboardSpy).toHaveBeenCalledWith(buildAddress(stop));
    expect(toastSpy).toHaveBeenCalledWith('Address copied');
  });

  it('shows an error toast when clipboard copy fails', async () => {
    const stop = createDelivery();
    const clipboardSpy = jasmine
      .createSpy('writeText')
      .and.callFake(() => Promise.reject(new Error('copy failed')));
    const toastSpy = spyOn(toast, 'show');
    const restoreClipboard = stubClipboard({ writeText: clipboardSpy });

    try {
      await component.copyAddress(stop);
    } finally {
      restoreClipboard();
    }

    expect(clipboardSpy).toHaveBeenCalledWith(buildAddress(stop));
    expect(toastSpy).toHaveBeenCalledWith('Copy failed', 'error');
  });
});
