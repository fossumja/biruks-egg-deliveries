import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DonationAmountPickerComponent } from '../components/donation-amount-picker.component';
import { StopDeliveryCardComponent } from '../components/stop-delivery-card.component';
import { Delivery, DonationInfo } from '../models/delivery.model';
import { Route } from '../models/route.model';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-route-planner',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    DonationAmountPickerComponent,
    StopDeliveryCardComponent,
  ],
  templateUrl: './route-planner.component.html',
  styleUrl: './route-planner.component.scss',
})
export class RoutePlannerComponent {
  readonly ALL_SCHEDULES = '__ALL_SCHEDULES__';
  private route = inject(ActivatedRoute);
  private storage = inject(StorageService);
  private router = inject(Router);
  private toast = inject(ToastService);

  routeDate?: string;
  routes: Route[] = [];
  deliveries: Delivery[] = [];
  filteredDeliveries: Delivery[] = [];
  loading = true;
  errorMessage = '';
  donationModalStop: Delivery | null = null;
  donationDraft?: Delivery;
  showAmountPicker = false;
  amountOptions: number[] = [];
  selectedAmount = 0;
  offScheduleStop: Delivery | null = null;
  offDonationDraft: DonationInfo | null = null;
  offDeliveredQty = 0;
  pickerMode: 'main' | 'off' | null = null;
  openRowId: string | null = null;
  isSwiping = false;
  private swipeThreshold = 24; // px
  private swipeDistance = 210; // px reveal width
  private swipeStartX: number | null = null;
  showSearch = false;
  searchTerm = '';
  showNewForm = false;
  savingNew = false;
  newDelivery = {
    routeDate: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    dozens: 1,
    notes: '',
  };
  editingStop: Delivery | null = null;
  editDraft = {
    routeDate: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    dozens: 1,
    notes: '',
  };

  startSwipe(event: PointerEvent, stop: Delivery): void {
    this.swipeStartX = event.clientX;
    this.isSwiping = false;
  }

  openOffScheduleDelivery(stop: Delivery): void {
    this.closeSwipe();
    this.offScheduleStop = stop;
    const suggested = (stop.dozens ?? 0) * 4;
    this.offDonationDraft = {
      status: stop.donation?.status ?? 'NotRecorded',
      method: stop.donation?.method,
      amount: stop.donation?.amount ?? suggested,
      suggestedAmount: suggested,
    };
    this.offDeliveredQty = stop.deliveredDozens ?? stop.dozens ?? 0;
  }

  closeOffSchedule(): void {
    this.offScheduleStop = null;
    this.offDonationDraft = null;
    this.offDeliveredQty = 0;
    this.pickerMode = null;
  }

  setOffDonationStatus(status: 'NotRecorded' | 'Donated' | 'NoDonation'): void {
    if (!this.offDonationDraft) return;
    this.offDonationDraft.status = status;
    if (status === 'NoDonation') {
      this.offDonationDraft.amount = 0;
      this.offDonationDraft.method = undefined;
    } else if (status === 'NotRecorded') {
      this.offDonationDraft.amount = undefined;
      this.offDonationDraft.method = undefined;
    } else {
      this.offDonationDraft.amount =
        this.offDonationDraft.amount ?? this.offDonationDraft.suggestedAmount ?? 0;
    }
  }

  setOffDonationMethod(method: 'cash' | 'venmo' | 'ach' | 'paypal' | 'other'): void {
    if (!this.offDonationDraft) return;
    this.offDonationDraft.status = 'Donated';
    this.offDonationDraft.method = method;
    if (this.offDonationDraft.amount == null) {
      this.offDonationDraft.amount = this.offDonationDraft.suggestedAmount ?? 0;
    }
  }

  adjustOffDelivered(delta: number): void {
    const next = Math.max(0, (this.offDeliveredQty || 0) + delta);
    this.offDeliveredQty = next;
    if (this.offDonationDraft) {
      this.offDonationDraft.suggestedAmount = next * 4;
      if (this.offDonationDraft.status === 'Donated' && this.offDonationDraft.amount == null) {
        this.offDonationDraft.amount = next * 4;
      }
    }
  }

  async saveOffSchedule(): Promise<void> {
    if (!this.offScheduleStop || !this.offDonationDraft) {
      this.closeOffSchedule();
      return;
    }
    const stop = this.offScheduleStop;
    const donation = { ...this.offDonationDraft, date: new Date().toISOString() };
    await this.storage.markDelivered(stop.id, this.offDeliveredQty || stop.dozens);
    await this.storage.updateDonation(stop.id, donation);
    await this.loadDeliveries();
    this.closeOffSchedule();
  }

  openOffAmountInput(): void {
    // inline picker handles selection; keep handler for compatibility
  }

  onOffAmountChange(amount: number): void {
    if (!this.offDonationDraft) return;
    this.offDonationDraft.status = 'Donated';
    this.offDonationDraft.amount = amount;
    this.offDonationDraft.method = this.offDonationDraft.method ?? 'cash';
    this.offDonationDraft.date = new Date().toISOString();
    this.offDonationDraft.suggestedAmount =
      this.offDonationDraft.suggestedAmount ?? this.offDeliveredQty * 4;
  }

  async copyAddress(stop?: Delivery | null): Promise<void> {
    const target = stop ?? this.offScheduleStop;
    if (!target) return;
    const address = `${target.address}, ${target.city}, ${target.state} ${target.zip ?? ''}`.trim();
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

  openMaps(stop?: Delivery | null): void {
    const target = stop ?? this.offScheduleStop;
    if (!target) return;
    const address = `${target.address}, ${target.city}, ${target.state} ${target.zip ?? ''}`;
    const url = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }

  moveSwipe(event: PointerEvent, stop: Delivery): void {
    if (this.swipeStartX === null) return;
    const deltaX = event.clientX - this.swipeStartX;
    if (Math.abs(deltaX) > 6) {
      this.isSwiping = true;
    }
  }

  endSwipe(event: PointerEvent, stop: Delivery): void {
    if (this.swipeStartX === null) return;
    const deltaX = event.clientX - this.swipeStartX;
    if (deltaX < -this.swipeThreshold) {
      this.openRowId = stop.id;
    } else if (deltaX > this.swipeThreshold) {
      this.openRowId = null;
    }
    this.swipeStartX = null;
    this.isSwiping = false;
  }

  toggleRow(stop: Delivery): void {
    if (this.isSwiping) return;
    this.openRowId = this.openRowId === stop.id ? null : stop.id;
  }

  closeSwipe(): void {
    this.openRowId = null;
    this.isSwiping = false;
  }

  handleDragStart(): void {
    this.openRowId = null;
  }

  getRowTransform(stop: Delivery): string {
    return this.openRowId === stop.id
      ? `translateX(-${this.swipeDistance}px)`
      : 'translateX(0)';
  }

  openNewDeliveryForm(): void {
    this.showNewForm = true;
    this.newDelivery.routeDate = this.routeDate ?? '';
  }

  cancelNewDelivery(): void {
    this.showNewForm = false;
    this.resetNewDelivery();
  }

  get canSaveNew(): boolean {
    return (
      !!this.routeDate &&
      !!this.newDelivery.name.trim() &&
      Number(this.newDelivery.dozens) > 0
    );
  }

  get newDeliveryErrors(): string[] {
    const errors: string[] = [];
    if (!this.newDelivery.name.trim()) errors.push('Name is required.');
    if (!(Number(this.newDelivery.dozens) > 0))
      errors.push('Dozens must be greater than 0.');
    return errors;
  }

  async saveNewDelivery(): Promise<void> {
    const targetRoute = this.newDelivery.routeDate || this.routeDate;
    if (!targetRoute || !this.canSaveNew) return;
    this.savingNew = true;
    try {
      await this.storage.addDelivery(targetRoute, {
        ...this.newDelivery,
        dozens: Number(this.newDelivery.dozens) || 0,
        routeDate: targetRoute,
      });
      this.routeDate = targetRoute;
      this.persistRouteSelection();
      this.toast.show('Delivery added');
      this.resetNewDelivery();
      this.showNewForm = false;
      await this.loadDeliveries();
    } catch (err) {
      console.error('Failed to add delivery', err);
      this.errorMessage = 'Failed to add delivery.';
      this.toast.show('Failed to add delivery', 'error');
    } finally {
      this.savingNew = false;
    }
  }

  private resetNewDelivery(): void {
    this.newDelivery = {
      routeDate: this.routeDate ?? '',
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      dozens: 1,
      notes: '',
    };
  }

  async ngOnInit(): Promise<void> {
    this.routes = await this.storage.getRoutes();
    this.routeDate = this.route.snapshot.paramMap.get('routeDate') || undefined;
    if (!this.routeDate) {
      this.routeDate = await this.pickFallbackRoute();
    }
    this.newDelivery.routeDate = this.routeDate ?? '';
    if (!this.routeDate) {
      this.errorMessage = 'No route selected.';
      this.loading = false;
      return;
    }
    await this.loadDeliveries();
    this.persistRouteSelection();
  }

  async loadDeliveries(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      if (!this.routeDate) {
        this.deliveries = [];
        this.filteredDeliveries = [];
        this.errorMessage = 'No route selected.';
        return;
      }
      if (this.routeDate === this.ALL_SCHEDULES) {
        const all = await this.storage.getAllDeliveries();
        this.deliveries = all.sort((a, b) => {
          const dateCmp = (a.routeDate || '').localeCompare(b.routeDate || '');
          if (dateCmp !== 0) return dateCmp;
          return (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
        });
      } else {
        this.deliveries = await this.storage.getDeliveriesByRoute(this.routeDate);
      }
      this.applyFilter(false);
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Failed to load deliveries.';
    } finally {
      this.loading = false;
    }
  }

  async drop(event: CdkDragDrop<Delivery[]>): Promise<void> {
    if (this.showSearch && this.searchTerm.trim()) {
      return;
    }
    moveItemInArray(this.deliveries, event.previousIndex, event.currentIndex);
    this.deliveries = this.deliveries.map((d, idx) => ({
      ...d,
      sortIndex: idx,
      deliveryOrder: idx,
    }));
    await this.storage.saveSortOrder(this.deliveries);
    this.applyFilter(false);
  }

  startRun(): void {
    if (this.routeDate) {
      localStorage.setItem('currentRoute', this.routeDate);
      this.router.navigate(['/run', this.routeDate]);
    }
  }

  async resetStop(stop: Delivery): Promise<void> {
    this.closeSwipe();
    await this.storage.resetDelivery(stop.id);
    // Optimistically update in place for immediate UI feedback
    stop.dozens = stop.originalDozens ?? stop.dozens;
    stop.status = '';
    stop.deliveredDozens = undefined;
    stop.donation = {
      status: 'NotRecorded',
      suggestedAmount: (stop.dozens ?? 0) * 4,
    };
    stop.updatedAt = new Date().toISOString();
    // Also reload to stay in sync with DB
    await this.loadDeliveries();
    this.applyFilter(false);
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
    this.applyFilter(false);
  }

  async skipStop(stop: Delivery): Promise<void> {
    this.closeSwipe();
    await this.storage.markSkipped(stop.id, 'Canceled');
    await this.loadDeliveries();
    this.applyFilter(false);
  }

  isSkipped(stop: Delivery | null | undefined): boolean {
    return !!stop && stop.status === 'skipped';
  }

  async unskipStop(stop: Delivery): Promise<void> {
    this.closeSwipe();
    await this.storage.updateDeliveryFields(stop.id, {
      status: '',
      skippedAt: undefined,
      skippedReason: undefined,
      synced: false,
      updatedAt: new Date().toISOString(),
    });
    await this.loadDeliveries();
    this.applyFilter(false);
  }

  async resetRoute(): Promise<void> {
    if (!this.routeDate) return;
    const confirmClear = window.confirm(
      'Reset route? This will clear statuses, planned adjustments, and donation info.'
    );
    if (!confirmClear) return;
    await this.storage.resetRoute(this.routeDate);
    await this.loadDeliveries();
  }

  private async pickFallbackRoute(): Promise<string | undefined> {
    const current = localStorage.getItem('currentRoute');
    const routes: Route[] = this.routes.length
      ? this.routes
      : await this.storage.getRoutes();
    if (current && routes.some((r) => r.routeDate === current)) {
      return current;
    }
    return routes[0]?.routeDate;
  }

  async adjustPlanned(stop: Delivery, delta: number): Promise<void> {
    const next = Math.max(0, (stop.dozens || 0) + delta);
    await this.updatePlanned(stop, next);
  }

  onRouteChange(routeDate: string | null): void {
    if (!routeDate) {
      this.routeDate = undefined;
      this.deliveries = [];
      this.filteredDeliveries = [];
      return;
    }
    this.routeDate = routeDate;
    if (routeDate !== this.ALL_SCHEDULES) {
      this.persistRouteSelection();
    }
    void this.loadDeliveries();
  }

  private persistRouteSelection(): void {
    if (this.routeDate && this.routeDate !== this.ALL_SCHEDULES) {
      localStorage.setItem('currentRoute', this.routeDate);
      localStorage.setItem('lastSelectedRoute', this.routeDate);
    }
  }

  getDonationPillLabel(stop: Delivery): string {
    const suggested = (stop.dozens ?? 0) * 4;
    const donation = stop.donation;
    if (!donation || donation.status === 'NotRecorded') return 'Donation';
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
    if (!donation || donation.status === 'NotRecorded')
      return 'pill pill-muted';
    if (donation.status === 'NoDonation') return 'pill pill-neutral';
    if (donation.method === 'cash') return 'pill pill-cash';
    if (donation.method === 'venmo') return 'pill pill-venmo';
    return 'pill pill-donated';
  }

  openDonationDetails(stop: Delivery): void {
    this.closeSwipe();
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
        note: stop.donation?.note,
      },
    };
  }

  closeDonationModal(): void {
    this.donationModalStop = null;
    this.donationDraft = undefined;
    this.showAmountPicker = false;
    this.pickerMode = null;
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
      suggestedAmount: (this.donationDraft.dozens ?? 0) * 4,
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

  setDonationMethod(method: 'cash' | 'venmo' | 'ach' | 'paypal' | 'other'): void {
    if (!this.donationDraft) return;
    const donation = this.donationDraft.donation ?? {
      status: 'NotRecorded',
      suggestedAmount: (this.donationDraft.dozens ?? 0) * 4,
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
    this.pickerMode = 'main';
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
    if (this.pickerMode === 'off') {
      if (!this.offDonationDraft) return;
      this.offDonationDraft.status = this.offDonationDraft.status || 'Donated';
      this.offDonationDraft.amount = amount;
      this.offDonationDraft.method = this.offDonationDraft.method ?? 'cash';
      this.offDonationDraft.date = new Date().toISOString();
    } else {
      if (!this.donationDraft) return;
      const donation = this.donationDraft.donation ?? {
        status: 'Donated',
        suggestedAmount: (this.donationDraft.dozens ?? 0) * 4,
      };
      donation.status = 'Donated';
      donation.amount = amount;
      donation.method = donation.method ?? 'cash';
      donation.date = donation.date ?? new Date().toISOString();
      donation.suggestedAmount = (this.donationDraft.dozens ?? 0) * 4;
      this.donationDraft.donation = donation;
    }
    this.showAmountPicker = false;
    this.pickerMode = null;
  }

  openEdit(stop: Delivery): void {
    this.closeSwipe();
    this.editingStop = stop;
    this.editDraft = {
      routeDate: stop.routeDate,
      name: stop.name,
      address: stop.address,
      city: stop.city,
      state: stop.state,
      zip: stop.zip ?? '',
      dozens: stop.dozens,
      notes: stop.notes ?? '',
    };
  }

  cancelEdit(): void {
    this.editingStop = null;
  }

  async saveEdit(): Promise<void> {
    if (!this.editingStop) return;
    const stop = this.editingStop;
    const targetRoute = this.editDraft.routeDate || stop.routeDate;
    const updates: Partial<Delivery> = {
      name: this.editDraft.name,
      address: this.editDraft.address,
      city: this.editDraft.city,
      state: this.editDraft.state,
      zip: this.editDraft.zip || undefined,
      notes: this.editDraft.notes || undefined,
    };
    const dozensChanged = this.editDraft.dozens !== stop.dozens;
    if (dozensChanged) {
      await this.storage.updatePlannedDozens(
        stop.id,
        Number(this.editDraft.dozens) || 0
      );
    }
    if (targetRoute && targetRoute !== stop.routeDate) {
      const targetList = await this.storage.getDeliveriesByRoute(targetRoute);
      const nextIndex = targetList.length;
      await this.storage.updateDeliveryFields(stop.id, {
        ...updates,
        routeDate: targetRoute,
        runId: targetRoute,
        week: targetRoute.replace(/\s+/g, '') || 'Schedule',
        sortIndex: nextIndex,
        deliveryOrder: nextIndex,
      });
      this.routeDate = targetRoute;
      this.persistRouteSelection();
    } else {
      await this.storage.updateDeliveryFields(stop.id, updates);
    }
    await this.loadDeliveries();
    this.editingStop = null;
  }

  async unsubscribeStop(stop: Delivery): Promise<void> {
    await this.storage.markSkipped(stop.id, 'Unsubscribed');
    await this.storage.updateDeliveryFields(stop.id, {
      subscribed: false,
    });
    // Refresh from DB so status/reason are present before reordering.
    const list = await this.storage.getDeliveriesByRoute(this.routeDate!);
    const idx = list.findIndex((d) => d.id === stop.id);
    if (idx >= 0) {
      const [removed] = list.splice(idx, 1);
      list.push(removed);
      list.forEach((d, i) => {
        d.sortIndex = i;
        d.deliveryOrder = i;
      });
      await this.storage.saveSortOrder(list);
      this.deliveries = list;
    }
    this.editingStop = null;
  }

  isUnsubscribed(stop: Delivery | null | undefined): boolean {
    if (!stop) return false;
    const reason = stop.skippedReason?.toLowerCase?.().trim() ?? '';
    return stop.status === 'skipped' && reason.includes('unsubscribed');
  }

  async resubscribeStop(stop: Delivery): Promise<void> {
    const updates: Partial<Delivery> = {
      status: '',
      skippedAt: undefined,
      skippedReason: undefined,
      subscribed: true,
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    await this.storage.updateDeliveryFields(stop.id, updates);
    await this.loadDeliveries();
    this.editingStop = null;
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchTerm = '';
      this.applyFilter(false);
    }
  }

  applyFilter(resetScroll = true): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredDeliveries = [...this.deliveries];
      return;
    }
    this.filteredDeliveries = this.deliveries.filter((d) => {
      return (
        d.name?.toLowerCase().includes(term) ||
        d.address?.toLowerCase().includes(term) ||
        d.city?.toLowerCase().includes(term)
      );
    });
  }
}
