import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StopDeliveryCardComponent } from './stop-delivery-card.component';
import { DonationControlsComponent } from './donation-controls.component';
import { Delivery } from '../models/delivery.model';

const createStop = (overrides: Partial<Delivery> = {}): Delivery => ({
  id: 'stop-1',
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

describe('StopDeliveryCardComponent', () => {
  let component: StopDeliveryCardComponent;
  let fixture: ComponentFixture<StopDeliveryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopDeliveryCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopDeliveryCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('stop', createStop());
    fixture.componentRef.setInput('deliveredQty', 2);
    fixture.componentRef.setInput('donation', { status: 'NoDonation', amount: 0, suggestedAmount: 8 });
    fixture.componentRef.setInput('suggestedAmount', 8);
    fixture.detectChanges();
  });

  it('emits adjust, copy, and map events', () => {
    const adjustSpy = spyOn(component.adjustQty, 'emit');
    const copySpy = spyOn(component.copyAddress, 'emit');
    const mapSpy = spyOn(component.openMap, 'emit');

    const qtyButtons = fixture.nativeElement.querySelectorAll('.qty-btn');
    qtyButtons[0]?.dispatchEvent(new Event('click'));
    qtyButtons[1]?.dispatchEvent(new Event('click'));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ) as HTMLButtonElement[];
    const copyButton = buttons.find((btn) =>
      (btn.textContent ?? '').trim() === 'Copy'
    );
    const mapButton = buttons.find((btn) =>
      (btn.textContent ?? '').trim() === 'Open Map'
    );

    copyButton?.dispatchEvent(new Event('click'));
    mapButton?.dispatchEvent(new Event('click'));

    expect(adjustSpy).toHaveBeenCalledWith(-1);
    expect(adjustSpy).toHaveBeenCalledWith(1);
    expect(copySpy).toHaveBeenCalled();
    expect(mapSpy).toHaveBeenCalled();
  });

  it('relays donation control events', () => {
    const statusEmitted: string[] = [];
    const methodEmitted: string[] = [];
    const amountEmitted: number[] = [];

    component.donationStatusChange.subscribe((value) => statusEmitted.push(value));
    component.donationMethodChange.subscribe((value) => methodEmitted.push(value));
    component.amountChange.subscribe((value) => amountEmitted.push(value));

    const donationControls = fixture.debugElement.query(
      By.directive(DonationControlsComponent)
    );

    donationControls.triggerEventHandler('donationStatusChange', 'NoDonation');
    donationControls.triggerEventHandler('donationMethodChange', 'cash');
    donationControls.triggerEventHandler('amountChange', 12);

    expect(statusEmitted).toEqual(['NoDonation']);
    expect(methodEmitted).toEqual(['cash']);
    expect(amountEmitted).toEqual([12]);
  });

  it('hides header and address text while keeping address actions', () => {
    fixture.componentRef.setInput('showHeaderInfo', false);
    fixture.componentRef.setInput('showStatusPill', false);
    fixture.componentRef.setInput('showAddressText', false);
    fixture.componentRef.setInput('showAddressActions', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stop-name')).toBeNull();
    expect(fixture.nativeElement.querySelector('.status-pill')).toBeNull();
    expect(fixture.nativeElement.querySelector('.stop-address')).toBeNull();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ) as HTMLButtonElement[];
    const copyButton = buttons.find((btn) =>
      (btn.textContent ?? '').trim() === 'Copy'
    );
    const mapButton = buttons.find((btn) =>
      (btn.textContent ?? '').trim() === 'Open Map'
    );

    expect(copyButton).toBeTruthy();
    expect(mapButton).toBeTruthy();
  });
});
