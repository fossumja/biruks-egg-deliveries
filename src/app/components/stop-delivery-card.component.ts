import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Delivery, DonationInfo, DonationMethod, DonationStatus } from '../models/delivery.model';

@Component({
  selector: 'app-stop-delivery-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stop-delivery-card.component.html',
  styleUrl: './stop-delivery-card.component.scss'
})
export class StopDeliveryCardComponent implements OnChanges {
  @Input() stop: Delivery | null = null;
  @Input() deliveredQty = 0;
  @Input() donation: DonationInfo | null = null;
  @Input() suggestedAmount = 0;
  @Input() showNoDonation = true;
  @Input() showNotes = true;

  @Output() adjustQty = new EventEmitter<number>(); // delta
  @Output() donationStatusChange = new EventEmitter<DonationStatus>();
  @Output() donationMethodChange = new EventEmitter<DonationMethod>();
  @Output() amountChange = new EventEmitter<number>();
  @Output() copyAddress = new EventEmitter<void>();
  @Output() openMap = new EventEmitter<void>();

  amountOptions: number[] = [];
  amountValue = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if ('donation' in changes || 'suggestedAmount' in changes) {
      const base =
        (this.donation?.amount ??
          this.donation?.suggestedAmount ??
          this.suggestedAmount ??
          0) ?? 0;
      this.amountValue = base;
      this.refreshAmountOptions(base);
    }
    // Ensure status defaults to Donated when a method is chosen and no status set
    if (this.donation?.status === undefined && this.donation?.method) {
      this.donation.status = 'Donated';
    }
  }

  onAdjustQty(delta: number): void {
    this.adjustQty.emit(delta);
  }

  onDonationStatus(status: DonationStatus): void {
    this.donationStatusChange.emit(status);
  }

  onDonationMethod(method: DonationMethod): void {
    this.donationMethodChange.emit(method);
  }

  onAmountPicked(amount: number): void {
    this.amountChange.emit(amount);
  }

  onAmountChangeSelect(value: number): void {
    const num = Number(value) || 0;
    this.amountValue = num;
    this.onAmountPicked(num);
  }

  onCopyAddress(): void {
    this.copyAddress.emit();
  }

  onOpenMap(): void {
    this.openMap.emit();
  }

  private refreshAmountOptions(base: number): void {
    const max = Math.min(9999, Math.max(200, Math.ceil(base * 2 + 50)));
    this.amountOptions = Array.from({ length: max + 1 }, (_, i) => i);
  }
}
