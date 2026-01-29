import { CommonModule } from '@angular/common';
import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-donation-amount-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-amount-picker.component.html',
  styleUrl: './donation-amount-picker.component.scss'
})
export class DonationAmountPickerComponent {
  readonly currentAmount = input<number | null | undefined>(undefined);
  readonly suggestedAmount = input<number | null | undefined>(undefined);
  readonly cancel = output<void>();
  readonly save = output<number>();

  readonly amountInput = signal('');
  readonly amountError = signal('');
  private readonly donationAmountMax = 99999;

  constructor() {
    effect(() => {
      const next = this.computeDefaultAmount();
      this.amountInput.set(next != null ? String(next) : '');
      this.amountError.set(this.validateAmount(next));
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    const parsed = this.parseAmountInput(this.amountInput());
    const error = this.validateAmount(parsed, this.amountInput());
    if (error) {
      this.amountError.set(error);
      return;
    }
    this.save.emit(parsed ?? 0);
  }

  onAmountInputChange(value: unknown): void {
    const raw = value ?? '';
    this.amountInput.set(raw === null ? '' : String(raw));
    const parsed = this.parseAmountInput(raw);
    this.amountError.set(this.validateAmount(parsed, this.amountInput()));
  }

  private computeDefaultAmount(): number {
    const current = this.currentAmount();
    const hasCurrent =
      current !== null && current !== undefined && !Number.isNaN(current);
    if (hasCurrent) {
      return current as number;
    }
    const suggested = this.suggestedAmount();
    const hasSuggested =
      suggested !== null && suggested !== undefined && !Number.isNaN(suggested);
    if (hasSuggested) {
      return suggested as number;
    }
    return 0;
  }

  private parseAmountInput(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private validateAmount(value: number | null, rawInput?: string): string {
    if (rawInput !== undefined && rawInput !== '' && value == null) {
      return 'Enter a valid donation amount.';
    }
    if (value == null) return '';
    if (value < 0 || value > this.donationAmountMax) {
      return `Donation amount must be between $0 and $${this.donationAmountMax}.`;
    }
    return '';
  }
}
