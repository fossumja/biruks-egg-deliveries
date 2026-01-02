import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DeliveryRunComponent } from './delivery-run.component';
import { StorageService } from '../services/storage.service';
import { BackupService } from '../services/backup.service';
import { ToastService } from '../services/toast.service';
import { Delivery, DonationInfo } from '../models/delivery.model';
import { buildAddress, clearLocalStorage, createStop } from '../../testing/spec-helpers';

type DonationUpdate = {
  id: string;
  donation: DonationInfo;
};

class StorageServiceStub {
  deliveries: Delivery[] = [];
  updatedDonations: DonationUpdate[] = [];

  getSuggestedRate(): number {
    return 4;
  }

  async getDeliveriesByRoute(routeDate: string): Promise<Delivery[]> {
    return this.deliveries.filter((delivery) => delivery.routeDate === routeDate);
  }

  async updateDraftDelivered(_id: string, _qty: number): Promise<void> {}

  async markDelivered(_id: string, _qty: number): Promise<void> {}

  async markSkipped(_id: string, _reason: string): Promise<void> {}

  async updateDonation(id: string, donation: DonationInfo): Promise<void> {
    this.updatedDonations.push({ id, donation: { ...donation } });
  }

  async completeRun(_routeDate: string, _endedEarly: boolean): Promise<void> {}

  computeChangeStatus(
    stop: Delivery,
    overrides?: Partial<Delivery>,
    donationOverride?: DonationInfo
  ): Delivery['status'] {
    if (stop.status === 'delivered') return 'delivered';
    if (stop.status === 'skipped') return 'skipped';

    const baseDozens = stop.originalDozens ?? stop.dozens ?? 0;
    const currentDozens = overrides?.dozens ?? stop.dozens ?? 0;
    const baseDonation = stop.originalDonation ?? {
      status: 'NotRecorded',
      suggestedAmount: baseDozens * 4,
    };
    const currentDonation = donationOverride ?? stop.donation ?? {
      status: 'NotRecorded',
      suggestedAmount: currentDozens * 4,
    };

    const donationStatusChanged =
      (baseDonation.status ?? 'NotRecorded') !==
      (currentDonation.status ?? 'NotRecorded');
    const donationMethodChanged =
      (baseDonation.method ?? null) !== (currentDonation.method ?? null);
    const currentSuggested = currentDozens * 4;
    const currentAmount = Number(
      currentDonation.amount ?? currentDonation.suggestedAmount ?? currentSuggested
    );
    const donationAmountChanged =
      (currentDonation.status ?? 'NotRecorded') === 'Donated' &&
      currentAmount !== currentSuggested;
    const qtyChanged = Number(baseDozens) !== Number(currentDozens);

    return donationStatusChanged || donationMethodChanged || donationAmountChanged || qtyChanged
      ? 'changed'
      : '';
  }
}

class BackupServiceStub {
  async exportAll(): Promise<void> {}
}

class ToastServiceStub {
  messages: string[] = [];

  show(message: string): void {
    this.messages.push(message);
  }
}

describe('DeliveryRunComponent', () => {
  let component: DeliveryRunComponent;
  let fixture: ComponentFixture<DeliveryRunComponent>;
  let storage: StorageServiceStub;
  let toast: ToastServiceStub;

  beforeEach(async () => {
    clearLocalStorage();

    await TestBed.configureTestingModule({
      imports: [DeliveryRunComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: StorageService, useClass: StorageServiceStub },
        { provide: BackupService, useClass: BackupServiceStub },
        { provide: ToastService, useClass: ToastServiceStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ routeDate: 'Week A' })
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryRunComponent);
    component = fixture.componentInstance;
    storage = TestBed.inject(StorageService) as unknown as StorageServiceStub;
    toast = TestBed.inject(ToastService) as unknown as ToastServiceStub;
  });

  it('loads stops, sets counts, and selects the current stop', async () => {
    storage.deliveries = [
      createStop({ id: 'stop-1', status: 'delivered' }),
      createStop({ id: 'stop-2', status: '' }),
      createStop({ id: 'stop-3', status: 'skipped' }),
    ];

    await component.ngOnInit();

    expect(component.total).toBe(3);
    expect(component.doneCount).toBe(2);
    expect(component.currentStop?.id).toBe('stop-2');
  });

  it('adjusting quantity updates draft and marks status changed', async () => {
    storage.deliveries = [createStop({ id: 'stop-1', dozens: 2 })];
    const updateSpy = spyOn(storage, 'updateDraftDelivered').and.callThrough();

    await component.ngOnInit();
    component.adjustDelivered(1);

    expect(updateSpy).toHaveBeenCalledWith('stop-1', 3);
    expect(component.deliveredQty).toBe(3);
    expect(component.currentStop?.status).toBe('changed');
  });

  it('delivering a stop updates counts and advances', async () => {
    storage.deliveries = [
      createStop({ id: 'stop-1', dozens: 2 }),
      createStop({ id: 'stop-2', dozens: 1 }),
    ];
    const deliverSpy = spyOn(storage, 'markDelivered').and.callThrough();

    await component.ngOnInit();
    await component.markDelivered();

    expect(deliverSpy).toHaveBeenCalledWith('stop-1', 2);
    expect(component.doneCount).toBe(1);
    expect(component.currentStop?.id).toBe('stop-2');
  });

  it('skipping a stop updates counts and advances', async () => {
    storage.deliveries = [
      createStop({ id: 'stop-1', dozens: 2 }),
      createStop({ id: 'stop-2', dozens: 1 }),
    ];
    const skipSpy = spyOn(storage, 'markSkipped').and.callThrough();

    await component.ngOnInit();
    await component.confirmSkip('No answer');

    expect(skipSpy).toHaveBeenCalledWith('stop-1', 'No answer');
    expect(component.doneCount).toBe(1);
    expect(component.currentStop?.id).toBe('stop-2');
  });

  it('ending run early marks remaining stops skipped', async () => {
    storage.deliveries = [
      createStop({ id: 'stop-1', status: 'delivered' }),
      createStop({ id: 'stop-2', status: '' }),
      createStop({ id: 'stop-3', status: 'changed' }),
    ];

    await component.ngOnInit();
    await component.confirmEndRunEarly();

    const remaining = component.stops.filter((stop) => stop.id !== 'stop-1');
    expect(remaining.every((stop) => stop.status === 'skipped')).toBeTrue();
    expect(component.doneCount).toBe(3);
    expect(component.finished).toBeTrue();
    expect(component.currentStop).toBeUndefined();
  });

  it('updates donation status and method and refreshes status', async () => {
    storage.deliveries = [createStop({ id: 'stop-1' })];
    const updateSpy = spyOn(storage, 'updateDonation').and.callThrough();

    await component.ngOnInit();
    updateSpy.calls.reset();

    await component.setDonationStatus('NoDonation');

    expect(updateSpy).toHaveBeenCalled();
    expect(component.currentStop?.donation?.status).toBe('NoDonation');
    expect(component.currentStop?.donation?.amount).toBe(0);
    expect(component.currentStop?.status).toBe('changed');

    await component.setDonationDonated('cash');

    expect(component.currentStop?.donation?.status).toBe('Donated');
    expect(component.currentStop?.donation?.method).toBe('cash');
    expect(component.currentStop?.status).toBe('changed');
  });

  it('does not auto-select a donation method when amount changes', async () => {
    storage.deliveries = [
      createStop({
        id: 'stop-1',
        donation: { status: 'NotRecorded', suggestedAmount: 8 },
      })
    ];
    const updateSpy = spyOn(storage, 'updateDonation').and.callThrough();

    await component.ngOnInit();
    updateSpy.calls.reset();

    await component.onInlineAmountChange(12);

    expect(updateSpy).toHaveBeenCalled();
    expect(component.currentStop?.donation?.status).toBe('Donated');
    expect(component.currentStop?.donation?.method).toBeUndefined();
  });

  it('accepts decimal donation amounts over 100 from the amount picker', async () => {
    storage.deliveries = [
      createStop({
        id: 'stop-1',
        donation: { status: 'NotRecorded', suggestedAmount: 8 },
      })
    ];
    const updateSpy = spyOn(storage, 'updateDonation').and.callThrough();

    await component.ngOnInit();
    updateSpy.calls.reset();

    await component.confirmAmountFromPicker(125.75);

    expect(updateSpy).toHaveBeenCalled();
    expect(component.currentStop?.donation?.status).toBe('Donated');
    expect(component.currentStop?.donation?.amount).toBeCloseTo(125.75, 2);
  });

  it('falls back to web maps when user agent is not mobile', () => {
    const stop = createStop();
    component.currentStop = stop;
    const assignSpy = spyOn(
      component as unknown as { navigateToUrl: (url: string) => void },
      'navigateToUrl'
    );
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Chrome');

    component.openMaps();

    expect(assignSpy).toHaveBeenCalledWith(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buildAddress(stop))}`
    );
  });

  it('copies address using the fallback when clipboard is unavailable', async () => {
    const stop = createStop();
    component.currentStop = stop;
    const navigatorClipboard = navigator as unknown as { clipboard?: unknown };
    const hadClipboard = 'clipboard' in navigator;
    const originalClipboard = navigatorClipboard.clipboard;
    const execSpy = spyOn(document, 'execCommand').and.returnValue(true);

    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true
    });

    try {
      await component.copyAddress();
    } finally {
      if (hadClipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: originalClipboard,
          configurable: true
        });
      } else {
        delete navigatorClipboard.clipboard;
      }
    }

    expect(execSpy).toHaveBeenCalledWith('copy');
    expect(toast.messages).toContain('Address copied');
  });
});
