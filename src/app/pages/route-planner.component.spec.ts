import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RoutePlannerComponent } from './route-planner.component';
import { StorageService } from '../services/storage.service';
import { ReceiptHistoryEntry } from '../models/receipt-history-entry.model';
import { Delivery } from '../models/delivery.model';
import { Route } from '../models/route.model';
import { DeliveryRun } from '../models/delivery-run.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';

class StorageServiceStub {
  getSuggestedRate(): number {
    return 4;
  }

  getReceiptHistoryByBaseRowId(baseRowId: string): Promise<ReceiptHistoryEntry[]> {
    if (baseRowId === 'base-1') {
      return Promise.resolve([
        {
          kind: 'run',
          date: '2025-12-20T12:00:00.000Z',
          status: 'delivered',
          dozens: 2,
          donationStatus: 'Donated',
          donationMethod: 'cash',
          donationAmount: 8,
          taxableAmount: 0,
        },
        {
          kind: 'run',
          date: '2025-10-12T12:00:00.000Z',
          status: 'skipped',
          dozens: 0,
          donationStatus: 'NotRecorded',
          donationAmount: 0,
          taxableAmount: 0,
        }
      ]);
    }
    return Promise.resolve([]);
  }

  getRoutes(): Promise<Route[]> {
    return Promise.resolve([
      {
        routeDate: 'Week A',
        totalStops: 0,
        deliveredCount: 0,
        skippedCount: 0,
        completed: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        lastUpdatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
  }

  getRunsForSchedule(_scheduleId: string): Promise<DeliveryRun[]> {
    return Promise.resolve([]);
  }

  getAllRuns(): Promise<DeliveryRun[]> {
    return Promise.resolve([]);
  }

  getAllDeliveries(): Promise<Delivery[]> {
    return Promise.resolve([]);
  }

  getDeliveriesByRoute(_routeDate: string): Promise<Delivery[]> {
    return Promise.resolve([]);
  }

  getAllRunEntries(): Promise<RunSnapshotEntry[]> {
    return Promise.resolve([]);
  }

  getImportState(_id: string): Promise<null> {
    return Promise.resolve(null);
  }
}

describe('RoutePlannerComponent', () => {
  let component: RoutePlannerComponent;
  let fixture: ComponentFixture<RoutePlannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoutePlannerComponent, RouterTestingModule],
      providers: [{ provide: StorageService, useClass: StorageServiceStub }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoutePlannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders receipt history when opening the one-off donation modal', async () => {
    await fixture.whenStable();
    const stop = {
      id: 'stop-1',
      baseRowId: 'base-1',
      routeDate: 'Week A',
      name: 'Customer 1',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '00000',
      dozens: 2,
      status: '',
    } as Delivery;

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
});
