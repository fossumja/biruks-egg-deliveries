import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DonationAmountPickerComponent } from '../components/donation-amount-picker.component';
import { Delivery, DonationInfo, DonationMethod, DonationStatus } from '../models/delivery.model';
import { BackupService } from '../services/backup.service';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { cardChangeTrigger } from '../components/animations';

@Component({
  selector: 'app-delivery-run',
  standalone: true,
  imports: [CommonModule, FormsModule, DonationAmountPickerComponent],
  templateUrl: './delivery-run.component.html',
  styleUrl: './delivery-run.component.scss',
  animations: [cardChangeTrigger]
})
export class DeliveryRunComponent {
  private route = inject(ActivatedRoute);
  private storage = inject(StorageService);
  private router = inject(Router);
  private backup = inject(BackupService);
  private toast = inject(ToastService);

  routeDate?: string;
  stops: Delivery[] = [];
  currentStop?: Delivery;
  currentIndex = 0;
  total = 0;
  doneCount = 0;
  finished = false;
  loading = true;
  errorMessage = '';
  deliveredQty = 0;
  showAmountPicker = false;
  amountOptions: number[] = [];
  selectedAmount = 0;

  showSkipDialog = false;
  otherReason = '';

  async ngOnInit(): Promise<void> {
    this.routeDate = this.route.snapshot.paramMap.get('routeDate') || undefined;
    if (!this.routeDate) {
      this.errorMessage = 'No route selected.';
      this.loading = false;
      return;
    }
    await this.loadStops();
    this.setCurrent();
  }

  private async loadStops(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.stops = await this.storage.getDeliveriesByRoute(this.routeDate!);
      this.total = this.stops.length;
      this.doneCount = this.stops.filter((s) => s.status !== '').length;
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Failed to load route.';
    } finally {
      this.loading = false;
    }
  }

  private setCurrent(): void {
    const nextIndex = this.stops.findIndex((s) => s.status === '' || s.status === 'changed');
    if (nextIndex === -1) {
      this.finished = true;
      this.currentStop = undefined;
    } else {
      this.finished = false;
      this.currentIndex = nextIndex;
      this.currentStop = this.stops[this.currentIndex];
      this.deliveredQty = this.currentStop.deliveredDozens ?? this.currentStop.dozens;
      this.syncDonationDefaults();
    }
  }

  adjustDelivered(delta: number): void {
    const next = Math.max(0, (this.deliveredQty || 0) + delta);
    this.deliveredQty = next;
    if (this.currentStop) {
      void this.storage.updateDraftDelivered(this.currentStop.id, next);
      this.currentStop.dozens = next;
      this.currentStop.deliveredDozens = next;
      this.currentStop.status = 'changed';
      this.currentStop.updatedAt = new Date().toISOString();
      this.syncDonationDefaults();
    }
  }

  async markDelivered(): Promise<void> {
    if (!this.currentStop) return;
    const now = new Date().toISOString();
    await this.persistCurrentStopDonation();
    await this.storage.markDelivered(this.currentStop.id, this.deliveredQty);
    this.stops[this.currentIndex] = {
      ...this.currentStop,
      status: 'delivered',
      deliveredDozens: this.deliveredQty,
      dozens: this.deliveredQty,
      deliveredAt: now,
      updatedAt: now
    };
    this.doneCount = this.stops.filter((s) => s.status === 'delivered' || s.status === 'skipped').length;
    this.toast.show('Delivered!');
    this.setCurrent();
  }

  openSkipDialog(): void {
    this.showSkipDialog = true;
    this.otherReason = '';
  }

  async confirmSkip(reason: string): Promise<void> {
    if (!this.currentStop) return;
    const finalReason = (reason || this.otherReason || 'Skipped').trim();
    await this.storage.markSkipped(this.currentStop.id, finalReason);
    const now = new Date().toISOString();
    this.stops[this.currentIndex] = {
      ...this.currentStop,
      status: 'skipped',
      skippedAt: now,
      skippedReason: finalReason,
      updatedAt: now
    };
    this.doneCount = this.stops.filter((s) => s.status === 'delivered' || s.status === 'skipped').length;
    this.showSkipDialog = false;
    this.toast.show('Skipped!', 'info');
    this.setCurrent();
  }

  cancelSkip(): void {
    this.showSkipDialog = false;
  }

  async backupNow(): Promise<void> {
    try {
      await this.backup.exportAll();
      this.toast.show('Backup ready');
    } catch (err) {
      console.error(err);
      this.toast.show('Backup failed', 'error');
    }
  }

  finishRoute(): void {
    if (this.routeDate) {
      localStorage.removeItem('currentRoute');
    }
    this.router.navigate(['/']);
  }

  openMaps(): void {
    if (!this.currentStop) return;
    const address = `${this.currentStop.address}, ${this.currentStop.city}, ${this.currentStop.state} ${this.currentStop.zip ?? ''}`;
    const url = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }

  get suggestedDonationAmount(): number {
    if (!this.currentStop) return 0;
    return (this.currentStop.dozens ?? 0) * 4;
  }

  get progressPercent(): number {
    if (!this.total) return 0;
    return Math.min(100, (this.doneCount / this.total) * 100);
  }

  get currentDonation(): DonationInfo {
    if (!this.currentStop) {
      return { status: 'NotRecorded' };
    }
    if (!this.currentStop.donation) {
      this.currentStop.donation = {
        status: 'NotRecorded',
        suggestedAmount: this.suggestedDonationAmount
      };
    } else {
      this.currentStop.donation.suggestedAmount = this.suggestedDonationAmount;
    }
    return this.currentStop.donation;
  }

  setDonationStatus(status: DonationStatus): void {
    const donation = this.currentDonation;
    donation.status = status;
    donation.method = undefined;
    if (status === 'NoDonation') {
      donation.amount = 0;
    } else if (status === 'NotRecorded') {
      donation.amount = undefined;
    }
    donation.suggestedAmount = this.suggestedDonationAmount;
    donation.date = new Date().toISOString();
    void this.persistCurrentStopDonation();
  }

  setDonationDonated(method: DonationMethod): void {
    const donation = this.currentDonation;
    donation.status = 'Donated';
    donation.method = method;
    donation.suggestedAmount = this.suggestedDonationAmount;
    if (donation.amount == null) {
      donation.amount = this.suggestedDonationAmount;
    }
    donation.date = new Date().toISOString();
    void this.persistCurrentStopDonation();
  }

  openDonationAmountPicker(): void {
    this.amountOptions = Array.from({ length: 101 }, (_, i) => i);
    this.selectedAmount = this.currentDonation.amount ?? this.suggestedDonationAmount;
    this.showAmountPicker = true;
  }

  closeAmountPicker(): void {
    this.showAmountPicker = false;
  }

  confirmAmountFromPicker(amount: number): void {
    const donation = this.currentDonation;
    donation.status = 'Donated';
    donation.amount = amount;
    donation.method = donation.method ?? 'cash';
    donation.date = new Date().toISOString();
    void this.persistCurrentStopDonation();
    this.showAmountPicker = false;
  }

  private async persistCurrentStopDonation(): Promise<void> {
    if (!this.currentStop) return;
    await this.storage.updateDonation(this.currentStop.id, this.currentDonation);
  }

  private syncDonationDefaults(): void {
    if (!this.currentStop) return;
    const donation = this.currentDonation;
    donation.suggestedAmount = this.suggestedDonationAmount;
    if (donation.status === 'Donated' && donation.amount == null) {
      donation.amount = donation.suggestedAmount;
    }
    void this.persistCurrentStopDonation();
  }
}
