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

  amountValue = 0;
  qtyLocal = 0;
  private amountTouched = false;
  private readonly donationAmountMax = 9999;

  ngOnInit(): void {
    const base = this.computeBaseAmount();
    this.amountValue = base;
    this.qtyLocal = this.qtyValue;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When suggestedAmount changes (e.g., quantity changed), refresh the picker
    // to follow the new suggestion until the user explicitly customizes it.
    if ('suggestedAmount' in changes) {
      const nextSuggested = Number(this.suggestedAmount ?? 0) || 0;
      if (!this.amountTouched) {
        this.amountValue = nextSuggested;
      }
    } else if ('donation' in changes) {
      const base = this.computeBaseAmount();
      if (!this.amountTouched) {
        this.amountValue = base;
      }
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
    const num = Number(value);
    const next = this.clampAmount(Number.isFinite(num) ? num : 0);
    this.amountValue = next;
    this.amountTouched = true;
    this.amountChange.emit(next);
  }

  private clampAmount(value: number): number {
    return Math.min(this.donationAmountMax, Math.max(0, value));
  }
}
