import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-donation-amount-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-amount-picker.component.html',
  styleUrl: './donation-amount-picker.component.scss'
})
export class DonationAmountPickerComponent implements OnInit, OnChanges {
  @Input() currentAmount?: number;
  @Input() suggestedAmount?: number;
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<number>();

  amountOptions: number[] = [];
  selectedAmount = 0;

  ngOnInit(): void {
    this.amountOptions = Array.from({ length: 101 }, (_, i) => i);
    this.selectedAmount = this.computeDefaultAmount();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.selectedAmount = this.computeDefaultAmount();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    this.save.emit(this.selectedAmount);
  }

  private computeDefaultAmount(): number {
    const hasSuggested =
      this.suggestedAmount !== null &&
      this.suggestedAmount !== undefined &&
      !Number.isNaN(this.suggestedAmount);
    if (hasSuggested) {
      return this.suggestedAmount as number;
    }
    const hasCurrent =
      this.currentAmount !== null &&
      this.currentAmount !== undefined &&
      !Number.isNaN(this.currentAmount);
    if (hasCurrent) {
      return this.currentAmount as number;
    }
    return 0;
  }
}
