import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Delivery, DonationInfo, DonationMethod, DonationStatus } from '../models/delivery.model';
import { DonationControlsComponent } from './donation-controls.component';

@Component({
  selector: 'app-stop-delivery-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DonationControlsComponent],
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
  @Input() allowDonationReselect = false;

  @Output() adjustQty = new EventEmitter<number>(); // delta
  @Output() donationStatusChange = new EventEmitter<DonationStatus>();
  @Output() donationMethodChange = new EventEmitter<DonationMethod>();
  @Output() amountChange = new EventEmitter<number>();
  @Output() copyAddress = new EventEmitter<void>();
  @Output() openMap = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    // Ensure status defaults to Donated when a method is chosen and no status set
    if (('donation' in changes || 'suggestedAmount' in changes) && this.donation?.method && !this.donation.status) {
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

  onCopyAddress(): void {
    this.copyAddress.emit();
  }

  onOpenMap(): void {
    this.openMap.emit();
  }
}
