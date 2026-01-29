import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonationControlsComponent } from './donation-controls.component';

describe('DonationControlsComponent', () => {
  let component: DonationControlsComponent;
  let fixture: ComponentFixture<DonationControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonationControlsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationControlsComponent);
    component = fixture.componentInstance;
  });

  it('does not emit when reselecting the active status with allowReselect', () => {
    component.donation = {
      status: 'NoDonation',
      suggestedAmount: 8,
    };
    component.allowReselect = true;
    fixture.detectChanges();

    const statusSpy = spyOn(component.donationStatusChange, 'emit');

    component.onDonationStatus('NoDonation');

    expect(statusSpy).not.toHaveBeenCalled();
  });

  it('does not emit when reselecting the active status without allowReselect', () => {
    component.donation = {
      status: 'NoDonation',
      suggestedAmount: 8,
    };
    component.allowReselect = false;
    fixture.detectChanges();

    const statusSpy = spyOn(component.donationStatusChange, 'emit');

    component.onDonationStatus('NoDonation');

    expect(statusSpy).not.toHaveBeenCalled();
  });

  it('emits NoDonation and resets amount when reselecting the active method with allowReselect', () => {
    component.donation = {
      status: 'Donated',
      method: 'cash',
      suggestedAmount: 8,
    };
    component.allowReselect = true;
    fixture.detectChanges();

    const statusSpy = spyOn(component.donationStatusChange, 'emit');
    const amountSpy = spyOn(component.amountChange, 'emit');

    component.onDonationMethod('cash');

    expect(statusSpy).toHaveBeenCalledWith('NoDonation');
    expect(amountSpy).toHaveBeenCalledWith(0);
  });

  it('defaults the amount to 0 when status is NoDonation', () => {
    component.donation = {
      status: 'NoDonation',
      suggestedAmount: 8,
    };
    component.suggestedAmount = 8;
    fixture.detectChanges();

    expect(component.amountValue).toBe(0);
  });

  it('normalizes NotRecorded to NoDonation and resets amount', () => {
    component.donation = {
      status: 'NotRecorded',
      suggestedAmount: 8,
    };
    component.suggestedAmount = 8;
    fixture.detectChanges();

    expect(component.donation?.status).toBe('NoDonation');
    expect(component.amountValue).toBe(0);
  });

  it('populates the suggested amount when selecting a method from None', () => {
    component.donation = {
      status: 'NoDonation',
      suggestedAmount: 8,
    };
    component.suggestedAmount = 8;
    fixture.detectChanges();

    const amountSpy = spyOn(component.amountChange, 'emit');

    component.onDonationMethod('cash');

    expect(component.amountValue).toBe(8);
    expect(amountSpy).toHaveBeenCalledWith(8);
  });

  it('keeps the custom amount when selecting a method after manual entry', () => {
    component.donation = {
      status: 'Donated',
      amount: 25,
      suggestedAmount: 8,
    };
    component.suggestedAmount = 8;
    fixture.detectChanges();

    const amountSpy = spyOn(component.amountChange, 'emit');

    component.onDonationMethod('cash');

    expect(component.amountValue).toBe(25);
    expect(amountSpy).not.toHaveBeenCalled();
  });

  it('resets amount to 0 when moving from a custom amount to None', () => {
    component.donation = {
      status: 'Donated',
      amount: 12,
      suggestedAmount: 8,
    };
    component.suggestedAmount = 8;
    fixture.detectChanges();

    component.onAmountChangeSelect(12);

    component.donation = {
      status: 'NoDonation',
      suggestedAmount: 8,
    };
    fixture.detectChanges();

    expect(component.amountValue).toBe(0);
  });
});
