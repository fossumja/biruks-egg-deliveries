import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppHeaderComponent } from './app-header.component';
import { StorageService } from '../services/storage.service';
import { Delivery } from '../models/delivery.model';

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

class StorageServiceStub {
  deliveriesByRoute = new Map<string, Delivery[]>();
  allReceiptsSummary: {
    delivered: number;
    skipped: number;
    total: number;
    dozensDelivered: number;
    dozensTotal: number;
  } | null = null;

  async getAllReceiptsSummary(): Promise<typeof this.allReceiptsSummary> {
    return this.allReceiptsSummary;
  }

  async getRunEntries(_runId: string): Promise<[]> {
    return [];
  }

  async getRun(_runId: string): Promise<null> {
    return null;
  }

  async getDeliveriesByRoute(routeDate: string): Promise<Delivery[]> {
    return this.deliveriesByRoute.get(routeDate) ?? [];
  }
}

describe('AppHeaderComponent', () => {
  let component: AppHeaderComponent;
  let fixture: ComponentFixture<AppHeaderComponent>;
  let storage: StorageServiceStub;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AppHeaderComponent, RouterTestingModule],
      providers: [{ provide: StorageService, useClass: StorageServiceStub }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppHeaderComponent);
    component = fixture.componentInstance;
    storage = TestBed.inject(StorageService) as unknown as StorageServiceStub;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('computes route progress from current route summary', async () => {
    localStorage.setItem('currentRoute', 'Week A');
    storage.deliveriesByRoute.set('Week A', [
      createDelivery({ id: 'd1', status: 'delivered', deliveredDozens: 2 }),
      createDelivery({
        id: 'd2',
        status: 'skipped',
        skippedReason: 'Unsubscribed'
      }),
      createDelivery({
        id: 'd3',
        status: 'skipped',
        skippedReason: 'Customer away',
        dozens: 1
      }),
      createDelivery({ id: 'd4', status: '', dozens: 3 })
    ]);

    await (component as any).refreshSummary();

    expect(component.currentRouteSummary?.routeDate).toBe('Week A');
    expect(component.currentRouteSummary?.delivered).toBe(1);
    expect(component.currentRouteSummary?.skipped).toBe(1);
    expect(component.currentRouteSummary?.total).toBe(2);
    expect(component.routeProgress).toBe(50);
  });

  it('uses the all receipts summary when selected', async () => {
    localStorage.setItem('currentRunId', '__ALL_RECEIPTS__');
    storage.allReceiptsSummary = {
      delivered: 3,
      skipped: 1,
      total: 5,
      dozensDelivered: 10,
      dozensTotal: 12
    };

    await (component as any).refreshSummary();

    expect(component.currentRouteSummary?.routeDate).toBe('All receipts');
    expect(component.routeProgress).toBe(60);
  });
});
