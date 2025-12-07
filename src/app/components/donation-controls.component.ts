import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DonationInfo, DonationMethod, DonationStatus } from '../models/delivery.model';

@Component({
  selector: 'app-donation-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-controls.component.html',
  styleUrl: './donation-controls.component.scss'
})
export class DonationControlsComponent implements OnInit, OnChanges {
  @Input() donation: DonationInfo | null = null;
  @Input() suggestedAmount = 0;
  @Input() showNoDonation = true;
  @Input() allowReselect = false;
  @Input() showQty = false;
  @Input() qtyLabel = 'Quantity (dozen)';
  @Input() qtyValue = 0;

  @Output() donationStatusChange = new EventEmitter<DonationStatus>();
  @Output() donationMethodChange = new EventEmitter<DonationMethod>();
  @Output() amountChange = new EventEmitter<number>();
   @Output() qtyChange = new EventEmitter<number>();

  amountOptions: number[] = [];
  amountValue = 0;
  qtyLocal = 0;

  ngOnInit(): void {
    const base = this.computeBaseAmount();
    this.amountValue = base;
    this.refreshAmountOptions(base);
    this.qtyLocal = this.qtyValue;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('donation' in changes || 'suggestedAmount' in changes) {
      const base = this.computeBaseAmount();
      this.amountValue = base;
      this.refreshAmountOptions(base);
    }
    if ('qtyValue' in changes) {
      this.qtyLocal = this.qtyValue;
    }
    if (this.donation?.status === undefined && this.donation?.method) {
      this.donation.status = 'Donated';
    }
  }

  private computeBaseAmount(): number {
    return (
      (this.donation?.amount ??
        this.donation?.suggestedAmount ??
        this.suggestedAmount ??
        0) ?? 0
    );
  }

  onDonationStatus(status: DonationStatus): void {
    if (this.donation?.status === status) {
      if (this.allowReselect) {
        this.donationStatusChange.emit('NotRecorded');
      }
      return;
    }
    this.donationStatusChange.emit(status);
    if (status === 'NoDonation') {
      // Immediately reflect "None" by snapping the picker to $0
      this.amountValue = 0;
      this.refreshAmountOptions(0);
      this.amountChange.emit(0);
    }
  }

  changeQty(delta: number): void {
    const next = Math.max(0, (this.qtyLocal || 0) + delta);
    this.qtyLocal = next;
    this.qtyChange.emit(next);
  }

  onDonationMethod(method: DonationMethod): void {
    if (this.donation?.status === 'Donated' && this.donation?.method === method) {
      if (this.allowReselect) {
        // Toggle off to not recorded when re-clicking the active method.
        this.donationStatusChange.emit('NotRecorded');
      }
      return;
    }
    this.donationMethodChange.emit(method);
  }

  onAmountChangeSelect(value: number): void {
    const num = Number(value) || 0;
    this.amountValue = num;
    this.amountChange.emit(num);
  }

  private refreshAmountOptions(base: number): void {
    const max = Math.min(9999, Math.max(200, Math.ceil(base * 2 + 50)));
    this.amountOptions = Array.from({ length: max + 1 }, (_, i) => i);
  }
}
