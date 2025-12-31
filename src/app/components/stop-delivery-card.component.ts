import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Delivery, DonationInfo, DonationMethod, DonationStatus } from '../models/delivery.model';
import { DonationControlsComponent } from './donation-controls.component';

@Component({
  selector: 'app-stop-delivery-card',
  imports: [CommonModule, FormsModule, DonationControlsComponent],
  templateUrl: './stop-delivery-card.component.html',
  styleUrl: './stop-delivery-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StopDeliveryCardComponent {
  readonly stop = input<Delivery | null>(null);
  readonly deliveredQty = input(0);
  readonly donation = input<DonationInfo | null>(null);
  readonly suggestedAmount = input(0);
  readonly showNoDonation = input(true);
  readonly showNotes = input(true);
  readonly allowDonationReselect = input(false);
  readonly showHeaderInfo = input(true);
  readonly showStatusPill = input(true);
  readonly showAddressText = input(true);
  readonly showAddressActions = input(true);

  readonly adjustQty = output<number>(); // delta
  readonly donationStatusChange = output<DonationStatus>();
  readonly donationMethodChange = output<DonationMethod>();
  readonly amountChange = output<number>();
  readonly copyAddress = output<void>();
  readonly openMap = output<void>();

  readonly isUnsubscribed = computed(() => {
    const stop = this.stop();
    return !!stop
      && stop.status === 'skipped'
      && (stop.skippedReason?.toLowerCase?.() ?? '').includes('unsubscribed');
  });

  private readonly syncDonationStatus = effect(() => {
    const donation = this.donation();
    this.suggestedAmount();
    if (donation?.method && !donation.status) {
      donation.status = 'Donated';
    }
  });

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
