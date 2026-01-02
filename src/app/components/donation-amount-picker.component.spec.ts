import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonationAmountPickerComponent } from './donation-amount-picker.component';

describe('DonationAmountPickerComponent', () => {
  let component: DonationAmountPickerComponent;
  let fixture: ComponentFixture<DonationAmountPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonationAmountPickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationAmountPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a numeric input and emits a decimal amount', () => {
    const saveSpy = spyOn(component.save, 'emit');
    const input = fixture.nativeElement.querySelector(
      '#donation-amount-input'
    ) as HTMLInputElement;

    expect(input).toBeTruthy();
    expect(input.type).toBe('number');

    component.onAmountInputChange('1234.56');
    fixture.detectChanges();
    component.onSave();

    expect(saveSpy).toHaveBeenCalledWith(1234.56);
  });

  it('blocks save when the amount exceeds the max', () => {
    const saveSpy = spyOn(component.save, 'emit');
    component.onAmountInputChange('10000');
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector(
      '.amount-actions .btn.btn-primary'
    ) as HTMLButtonElement;

    expect(saveButton.disabled).toBeTrue();
    component.onSave();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('blocks save when the amount is not a valid number', () => {
    const saveSpy = spyOn(component.save, 'emit');
    component.onAmountInputChange('12.3.4');
    fixture.detectChanges();

    expect(component.amountError()).toBe('Enter a valid donation amount.');

    const saveButton = fixture.nativeElement.querySelector(
      '.amount-actions .btn.btn-primary'
    ) as HTMLButtonElement;

    expect(saveButton.disabled).toBeTrue();
    component.onSave();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
