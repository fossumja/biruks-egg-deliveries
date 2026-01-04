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

  it('emits NotRecorded when reselecting the active status with allowReselect', () => {
    component.donation = {
      status: 'NoDonation',
      suggestedAmount: 8,
    };
    component.allowReselect = true;
    fixture.detectChanges();

    const statusSpy = spyOn(component.donationStatusChange, 'emit');

    component.onDonationStatus('NoDonation');

    expect(statusSpy).toHaveBeenCalledWith('NotRecorded');
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

  it('emits NotRecorded when reselecting the active method with allowReselect', () => {
    component.donation = {
      status: 'Donated',
      method: 'cash',
      suggestedAmount: 8,
    };
    component.allowReselect = true;
    fixture.detectChanges();

    const statusSpy = spyOn(component.donationStatusChange, 'emit');

    component.onDonationMethod('cash');

    expect(statusSpy).toHaveBeenCalledWith('NotRecorded');
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
});
