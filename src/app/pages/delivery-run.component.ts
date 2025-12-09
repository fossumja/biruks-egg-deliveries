import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DonationAmountPickerComponent } from '../components/donation-amount-picker.component';
import { StopDeliveryCardComponent } from '../components/stop-delivery-card.component';
import { Delivery, DonationInfo, DonationMethod, DonationStatus } from '../models/delivery.model';
import { BackupService } from '../services/backup.service';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { cardChangeTrigger } from '../components/animations';

@Component({
  selector: 'app-delivery-run',
  standalone: true,
  imports: [CommonModule, FormsModule, DonationAmountPickerComponent, StopDeliveryCardComponent],
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
  private endedEarly = false;
  isCompleting = false;
  showEndRunDialog = false;

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
      this.stops = (await this.storage.getDeliveriesByRoute(this.routeDate!)).map((s) =>
        this.normalizeStop({ ...s })
      );
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
      // Natural completion (not ended early).
      this.endedEarly = false;
    } else {
      this.finished = false;
      this.currentIndex = nextIndex;
      this.currentStop = this.normalizeStop({ ...this.stops[this.currentIndex] });
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
      this.currentStop.updatedAt = new Date().toISOString();
      this.syncDonationDefaults();
      this.refreshCurrentStatus();
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

  openEndRunDialog(): void {
    this.showEndRunDialog = true;
  }

  cancelEndRun(): void {
    this.showEndRunDialog = false;
  }

  async confirmEndRunEarly(): Promise<void> {
    if (!this.stops.length) {
      this.showEndRunDialog = false;
      return;
    }
    const now = new Date().toISOString();
    const remaining = this.stops.filter(
      (s) => s.status === '' || s.status === 'changed'
    );
    try {
      for (const stop of remaining) {
        await this.storage.markSkipped(stop.id, 'Ended run early');
        stop.status = 'skipped';
        stop.skippedAt = now;
        stop.skippedReason = 'Ended run early';
        stop.updatedAt = now;
      }
      this.doneCount = this.stops.filter(
        (s) => s.status === 'delivered' || s.status === 'skipped'
      ).length;
      this.finished = true;
      this.currentStop = undefined;
      this.endedEarly = true;
      this.showEndRunDialog = false;
      this.toast.show('Run ended early; remaining stops skipped', 'info');
    } catch (err) {
      console.error('End run early failed', err);
      this.toast.show('Failed to end run early', 'error');
      this.showEndRunDialog = false;
    }
  }

  async backupNow(): Promise<void> {
    // Ensure the current run is archived first so the backup
    // includes this run's history, then export the CSV.
    const finalized = await this.finalizeRunInternal(true);
    if (!finalized) {
      return;
    }

    try {
      await this.backup.exportAll();
      this.toast.show('Backup ready');
    } catch (err) {
      console.error(err);
      this.toast.show('Backup failed', 'error');
      return;
    }

    this.finishRoute();
  }

  async completeRun(): Promise<void> {
    const finalized = await this.finalizeRunInternal(true);
    if (finalized) {
      this.finishRoute();
    }
  }

  private finishRoute(): void {
    if (this.routeDate) {
      localStorage.removeItem('currentRoute');
    }
    this.router.navigate(['/']);
  }

  private async finalizeRunInternal(showToast: boolean): Promise<boolean> {
    if (!this.routeDate || this.isCompleting) return false;
    if (this.stops.some((s) => s.status === '' || s.status === 'changed')) {
      if (showToast) {
        this.toast.show(
          'There are still pending stops. Deliver/skip or end run early first.',
          'error'
        );
      }
      return false;
    }
    this.isCompleting = true;
    try {
      await this.storage.completeRun(this.routeDate, this.endedEarly);
      if (showToast) {
        this.toast.show('Run archived and route reset for next time');
      }
      if (this.routeDate) {
        localStorage.removeItem('currentRoute');
      }
      return true;
    } catch (err) {
      console.error('Complete run failed', err);
      if (showToast) {
        this.toast.show('Failed to complete run', 'error');
      }
      return false;
    } finally {
      this.isCompleting = false;
    }
  }

  openMaps(): void {
    if (!this.currentStop) return;
    const address = `${this.currentStop.address}, ${this.currentStop.city}, ${this.currentStop.state} ${this.currentStop.zip ?? ''}`;
    const url = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
    window.location.assign(url);
  }

  async copyAddress(): Promise<void> {
    if (!this.currentStop) return;
    const address = `${this.currentStop.address}, ${this.currentStop.city}, ${this.currentStop.state} ${this.currentStop.zip ?? ''}`.trim();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = address;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.toast.show('Address copied');
    } catch (err) {
      console.error('Copy failed', err);
      this.toast.show('Copy failed', 'error');
    }
  }

  get suggestedDonationAmount(): number {
    if (!this.currentStop) return 0;
    return (this.currentStop.dozens ?? 0) * this.storage.getSuggestedRate();
  }

  get progressPercent(): number {
    if (!this.total) return 0;
    return Math.min(100, (this.doneCount / this.total) * 100);
  }

  get nextStop(): Delivery | undefined {
    if (!this.stops.length || this.finished) return undefined;
    return this.stops.slice(this.currentIndex + 1).find((s) => s.status === '' || s.status === 'changed');
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
      if (
        this.currentStop.donation.amount === undefined ||
        this.currentStop.donation.amount === null ||
        Number.isNaN(this.currentStop.donation.amount as number)
      ) {
        this.currentStop.donation.amount = this.suggestedDonationAmount;
      }
    }
    return this.currentStop.donation;
  }

  async setDonationStatus(status: DonationStatus): Promise<void> {
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
    await this.persistCurrentStopDonation();
  }

  async setDonationDonated(method: DonationMethod): Promise<void> {
    const donation = this.currentDonation;
    donation.status = 'Donated';
    donation.method = method;
    donation.suggestedAmount = this.suggestedDonationAmount;
    if (donation.amount == null) {
      donation.amount = this.suggestedDonationAmount;
    }
    donation.date = new Date().toISOString();
    await this.persistCurrentStopDonation();
  }

  openDonationAmountPicker(): void {
    this.amountOptions = Array.from({ length: 101 }, (_, i) => i);
    const current = Number(this.currentDonation.amount);
    this.selectedAmount = !Number.isNaN(current)
      ? current
      : this.suggestedDonationAmount;
    this.showAmountPicker = true;
  }

  closeAmountPicker(): void {
    this.showAmountPicker = false;
  }

  async confirmAmountFromPicker(amount: number): Promise<void> {
    const donation = this.currentDonation;
    donation.status = 'Donated';
    donation.amount = amount;
    donation.method = donation.method ?? 'cash';
    donation.date = new Date().toISOString();
    await this.persistCurrentStopDonation();
    this.selectedAmount = amount;
    this.showAmountPicker = false;
  }

  async onInlineAmountChange(amount: number): Promise<void> {
    const donation = this.currentDonation;
    const now = new Date().toISOString();
    this.selectedAmount = amount;

    if (donation.status === 'NoDonation') {
      // When "None" is selected, keep status as NoDonation while amount is 0.
      if (amount === 0) {
        donation.amount = 0;
        donation.method = undefined;
        donation.date = now;
        await this.persistCurrentStopDonation();
        return;
      }
      // User moved the picker off zero: treat as a real donation.
      donation.status = 'Donated';
    } else if (donation.status === 'NotRecorded') {
      if (amount === 0) {
        donation.amount = 0;
        donation.date = now;
        await this.persistCurrentStopDonation();
        return;
      }
      donation.status = 'Donated';
    }

    // For Donated (or statuses promoted to Donated)
    donation.amount = amount;
    donation.method = donation.method ?? 'cash';
    donation.date = now;
    await this.persistCurrentStopDonation();
  }

  private async persistCurrentStopDonation(): Promise<void> {
    if (!this.currentStop) return;
    await this.storage.updateDonation(this.currentStop.id, this.currentDonation);
    this.refreshCurrentStatus();
  }

  private syncDonationDefaults(): void {
    if (!this.currentStop) return;
    const donation = this.currentDonation;
    const prevSuggested =
      donation.suggestedAmount ?? this.suggestedDonationAmount;
    const nextSuggested = this.suggestedDonationAmount;
    donation.suggestedAmount = nextSuggested;
    if (
      donation.status === 'Donated' &&
      (donation.amount == null || donation.amount === prevSuggested)
    ) {
      donation.amount = nextSuggested;
    }
    void this.persistCurrentStopDonation();
  }

  private refreshCurrentStatus(): void {
    if (!this.currentStop) return;
    this.currentStop.status = this.storage.computeChangeStatus(this.currentStop, {
      dozens: this.deliveredQty,
      deliveredDozens: this.deliveredQty
    }, this.currentDonation);
    this.stops[this.currentIndex] = { ...this.currentStop };
  }

  private normalizeStop(stop: Delivery): Delivery {
    if (stop.originalDozens == null) {
      stop.originalDozens = stop.dozens ?? 0;
    }
    if (!stop.originalDonation) {
      stop.originalDonation = {
        status: 'NotRecorded',
        suggestedAmount: (stop.originalDozens ?? stop.dozens ?? 0) * 4
      };
    }
    if (!stop.donation) {
      stop.donation = {
        status: 'NotRecorded',
        suggestedAmount: (stop.dozens ?? 0) * 4
      };
    }
    stop.status = this.storage.computeChangeStatus(stop, undefined, stop.donation);
    return stop;
  }
}
