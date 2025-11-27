import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-donation-amount-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-amount-picker.component.html',
  styleUrl: './donation-amount-picker.component.scss'
})
export class DonationAmountPickerComponent implements OnInit {
  @Input() currentAmount?: number;
  @Input() suggestedAmount?: number;
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<number>();

  amountOptions: number[] = [];
  selectedAmount = 0;

  ngOnInit(): void {
    this.amountOptions = Array.from({ length: 101 }, (_, i) => i);
    this.selectedAmount = this.currentAmount ?? this.suggestedAmount ?? 0;
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    this.save.emit(this.selectedAmount);
  }
}
