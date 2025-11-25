import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DonationAmountPickerComponent } from '../components/donation-amount-picker.component';
import { Delivery } from '../models/delivery.model';
import { Route } from '../models/route.model';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-route-planner',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, DonationAmountPickerComponent],
  templateUrl: './route-planner.component.html',
  styleUrl: './route-planner.component.scss'
})
export class RoutePlannerComponent {
  private route = inject(ActivatedRoute);
  private storage = inject(StorageService);
  private router = inject(Router);

  routeDate?: string;
  deliveries: Delivery[] = [];
  loading = true;
  errorMessage = '';
  donationModalStop: Delivery | null = null;
  donationDraft?: Delivery;
  showAmountPicker = false;
  amountOptions: number[] = [];
  selectedAmount = 0;

  async ngOnInit(): Promise<void> {
    this.routeDate = this.route.snapshot.paramMap.get('routeDate') || undefined;
    if (!this.routeDate) {
      this.routeDate = await this.pickFallbackRoute();
    }
    if (!this.routeDate) {
      this.errorMessage = 'No route selected.';
      this.loading = false;
      return;
    }
    await this.loadDeliveries();
  }

  async loadDeliveries(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.deliveries = await this.storage.getDeliveriesByRoute(this.routeDate!);
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Failed to load deliveries.';
    } finally {
      this.loading = false;
    }
  }

  async drop(event: CdkDragDrop<Delivery[]>): Promise<void> {
    moveItemInArray(this.deliveries, event.previousIndex, event.currentIndex);
    this.deliveries = this.deliveries.map((d, idx) => ({
      ...d,
      sortIndex: idx,
      deliveryOrder: idx
    }));
    await this.storage.saveSortOrder(this.deliveries);
  }

  startRun(): void {
    if (this.routeDate) {
      localStorage.setItem('currentRoute', this.routeDate);
      this.router.navigate(['/run', this.routeDate]);
    }
  }

  async resetStop(stop: Delivery): Promise<void> {
    await this.storage.resetDelivery(stop.id);
    // Optimistically update in place for immediate UI feedback
    stop.dozens = stop.originalDozens ?? stop.dozens;
    stop.status = '';
    stop.deliveredDozens = undefined;
    stop.donation = {
      status: 'NotRecorded',
      suggestedAmount: (stop.dozens ?? 0) * 4
    };
    stop.updatedAt = new Date().toISOString();
    // Also reload to stay in sync with DB
    await this.loadDeliveries();
  }

  async updatePlanned(stop: Delivery, value: number): Promise<void> {
    const dozens = Math.max(0, Number(value) || 0);
    await this.storage.updatePlannedDozens(stop.id, dozens);
    stop.dozens = dozens;
    stop.status = 'changed';
    stop.deliveredDozens = undefined;
    stop.updatedAt = new Date().toISOString();
    if (stop.originalDozens === undefined) {
      stop.originalDozens = dozens;
    }
  }

  async skipStop(stop: Delivery): Promise<void> {
    await this.storage.markSkipped(stop.id, 'Canceled');
    await this.loadDeliveries();
  }

  async resetRoute(): Promise<void> {
    if (!this.routeDate) return;
    const confirmClear = window.confirm('Reset route? This will clear statuses, planned adjustments, and donation info.');
    if (!confirmClear) return;
    await this.storage.resetRoute(this.routeDate);
    await this.loadDeliveries();
  }

  private async pickFallbackRoute(): Promise<string | undefined> {
    const current = localStorage.getItem('currentRoute');
    const routes: Route[] = await this.storage.getRoutes();
    if (current && routes.some((r) => r.routeDate === current)) {
      return current;
    }
    return routes[0]?.routeDate;
  }

  async adjustPlanned(stop: Delivery, delta: number): Promise<void> {
    const next = Math.max(0, (stop.dozens || 0) + delta);
    await this.updatePlanned(stop, next);
  }

  getDonationPillLabel(stop: Delivery): string {
    const suggested = (stop.dozens ?? 0) * 4;
    const donation = stop.donation;
    if (!donation || donation.status === 'NotRecorded') return 'Not recorded';
    if (donation.status === 'NoDonation') return 'No donation';
    const amount = donation.amount ?? suggested;
    switch (donation.method) {
      case 'cash':
        return `Cash $${amount}`;
      case 'venmo':
        return `Venmo $${amount}`;
      case 'other':
        return `Donated $${amount}`;
      default:
        return `Donated $${amount}`;
    }
  }

  getDonationPillClass(stop: Delivery): string {
    const donation = stop.donation;
    if (!donation || donation.status === 'NotRecorded') return 'pill pill-muted';
    if (donation.status === 'NoDonation') return 'pill pill-neutral';
    if (donation.method === 'cash') return 'pill pill-cash';
    if (donation.method === 'venmo') return 'pill pill-venmo';
    return 'pill pill-donated';
  }

  openDonationDetails(stop: Delivery): void {
    this.donationModalStop = stop;
    // shallow clone to edit
    this.donationDraft = {
      ...stop,
      donation: {
        status: stop.donation?.status ?? 'NotRecorded',
        method: stop.donation?.method,
        amount: stop.donation?.amount,
        suggestedAmount: (stop.dozens ?? 0) * 4,
        date: stop.donation?.date,
        note: stop.donation?.note
      }
    };
  }

  closeDonationModal(): void {
    this.donationModalStop = null;
    this.donationDraft = undefined;
    this.showAmountPicker = false;
  }

  saveDonation(): void {
    if (!this.donationModalStop || !this.donationDraft?.donation) {
      this.closeDonationModal();
      return;
    }
    const donation = this.donationDraft.donation;
    donation.suggestedAmount = (this.donationModalStop.dozens ?? 0) * 4;
    this.donationModalStop.donation = donation;
    void this.storage.updateDonation(this.donationModalStop.id, donation);
    this.closeDonationModal();
  }

  setDonationStatus(status: 'NotRecorded' | 'Donated' | 'NoDonation'): void {
    if (!this.donationDraft) return;
    const donation = this.donationDraft.donation ?? {
      status: 'NotRecorded',
      suggestedAmount: (this.donationDraft.dozens ?? 0) * 4
    };
    donation.status = status;
    if (status === 'NoDonation') {
      donation.method = undefined;
      donation.amount = 0;
    } else if (status === 'NotRecorded') {
      donation.method = undefined;
      donation.amount = undefined;
    }
    donation.suggestedAmount = (this.donationDraft.dozens ?? 0) * 4;
    this.donationDraft.donation = donation;
  }

  setDonationMethod(method: 'cash' | 'venmo' | 'other'): void {
    if (!this.donationDraft) return;
    const donation = this.donationDraft.donation ?? {
      status: 'NotRecorded',
      suggestedAmount: (this.donationDraft.dozens ?? 0) * 4
    };
    donation.status = 'Donated';
    donation.method = method;
    donation.suggestedAmount = (this.donationDraft.dozens ?? 0) * 4;
    if (donation.amount == null) {
      donation.amount = donation.suggestedAmount;
    }
    this.donationDraft.donation = donation;
  }

  openAmountPicker(): void {
    if (!this.donationDraft) return;
    this.amountOptions = Array.from({ length: 101 }, (_, i) => i);
    this.selectedAmount =
      this.donationDraft.donation?.amount ??
      this.donationDraft.donation?.suggestedAmount ??
      (this.donationDraft.dozens ?? 0) * 4;
    this.showAmountPicker = true;
  }

  closeAmountPicker(): void {
    this.showAmountPicker = false;
  }

  confirmAmountFromPicker(amount: number): void {
    if (!this.donationDraft) return;
    const donation = this.donationDraft.donation ?? {
      status: 'Donated',
      suggestedAmount: (this.donationDraft.dozens ?? 0) * 4
    };
    donation.status = 'Donated';
    donation.amount = amount;
    donation.method = donation.method ?? 'cash';
    donation.date = donation.date ?? new Date().toISOString();
    donation.suggestedAmount = (this.donationDraft.dozens ?? 0) * 4;
    this.donationDraft.donation = donation;
    this.showAmountPicker = false;
  }
}
