import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Component, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DonationAmountPickerComponent } from '../components/donation-amount-picker.component';
import { StopDeliveryCardComponent } from '../components/stop-delivery-card.component';
import { DonationControlsComponent } from '../components/donation-controls.component';
import {
  Delivery,
  DonationInfo,
  DonationMethod,
  DonationStatus,
} from '../models/delivery.model';
import { Route } from '../models/route.model';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { DeliveryRun } from '../models/delivery-run.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';
import { ReceiptHistoryEntry } from '../models/receipt-history-entry.model';
import { BackupService } from '../services/backup.service';
import { getEventYear, normalizeEventDate, toSortableTimestamp } from '../utils/date-utils';

@Component({
  selector: 'app-route-planner',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    DonationAmountPickerComponent,
    DonationControlsComponent,
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
  private backup = inject(BackupService);
  private zone = inject(NgZone);

  routeDate?: string;
  routes: Route[] = [];
  deliveries: Delivery[] = [];
  filteredDeliveries: Delivery[] = [];
  loading = true;
  errorMessage = '';
  donationModalStop: Delivery | null = null;
  donationDraft?: Delivery;
  donationTotals = {
    donationTotal: 0,
    dozensTotal: 0,
    taxableTotal: 0,
    baselineTotal: 0,
  };
  oneOffMinYear = new Date().getFullYear();
  oneOffMaxYear = this.oneOffMinYear + 1;
  oneOffDateMin = `${this.oneOffMinYear}-01-01`;
  oneOffDateMax = `${this.oneOffMaxYear}-12-31`;
  oneOffYearRangeLabel = `${this.oneOffMinYear} and ${this.oneOffMaxYear}`;
  selectedTaxYearLabel = new Date().getFullYear();
  oneOffDonationDate = '';
  oneOffDonationDateError = '';
  private oneOffDonationDateTouched = false;
  oneOffDonationTypeError = '';
  oneOffDeliveryDate = '';
  oneOffDeliveryDateError = '';
  private oneOffDeliveryDateTouched = false;
  oneOffDeliveryTypeError = '';
  showAmountPicker = false;
  amountOptions: number[] = [];
  selectedAmount = 0;
   readonly receiptAmountOptions: number[] = Array.from(
    { length: 101 },
    (_, i) => i
  );
  offScheduleStop: Delivery | null = null;
  offDonationDraft: DonationInfo | null = null;
  offDeliveredQty = 0;
  pickerMode: 'main' | 'off' | null = null;
  openRowId: string | null = null;
  isSwiping = false;
  private swipeThreshold = 24; // px
  private swipeDistance = 210; // px reveal width
  private swipeStartX: number | null = null;
  private swipeStartY: number | null = null;
  private swipeMode: 'none' | 'swipe' | 'scroll' = 'none';
  showSearch = false;
  searchTerm = '';
  showNewForm = false;
  savingNew = false;
  reorderEnabled = false;
  runOptions: DeliveryRun[] = [];
  selectedRunId: string | 'live' | null = 'live';
  viewingRun = false;
  viewingAllReceipts = false;
  runEntries: RunSnapshotEntry[] = [];
  filteredRunEntries: RunSnapshotEntry[] = [];
  receiptHistory: ReceiptHistoryEntry[] = [];
  receiptHistoryLoading = false;
  private receiptHistoryBaseRowId: string | null = null;
  allRuns: DeliveryRun[] = [];
  selectedRouteOrRun: string | null = null;
  editingRunEntry: RunSnapshotEntry | null = null;
  runEntryDraft: {
    status: 'delivered' | 'skipped' | 'donation';
    dozens: number;
    deliveryOrder: number;
    donationStatus: DonationStatus;
    donationMethod: DonationMethod | '';
    donationAmount: number;
    suggestedAmount?: number;
  } | null = null;
  runEntryDate = '';
  runEntryDateError = '';
  newDelivery = {
    deliveryOrder: 0,
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
    deliveryOrder: 0,
    routeDate: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    dozens: 1,
    notes: '',
  };

  noop(): void {}

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getTodayDateInput(): string {
    return this.formatDateInput(new Date());
  }

  private formatEventDateForInput(value?: string): string {
    if (!value) return '';
    const normalized = normalizeEventDate(value);
    if (!normalized) return '';
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? '' : this.formatDateInput(parsed);
  }

  private readSelectedTaxYear(): number | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem('selectedTaxYear');
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
  }

  private syncSelectedTaxYear(): number {
    const resolved = this.readSelectedTaxYear();
    const nextYear = resolved ?? new Date().getFullYear();
    this.selectedTaxYearLabel = nextYear;
    return nextYear;
  }

  private validateOneOffDate(value: string): string {
    if (!value) return 'Date is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a valid date.';
    if (value < this.oneOffDateMin || value > this.oneOffDateMax) {
      return `Date must be between ${this.oneOffYearRangeLabel}.`;
    }
    return '';
  }

  private async refreshOneOffDateRange(): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const selectedYear = this.syncSelectedTaxYear();
    const dataYears = new Set<number>();
    const baselineYear = this.resolveBaselineYear(currentYear);
    dataYears.add(baselineYear);
    dataYears.add(selectedYear);

    const [deliveries, runEntries, runs] = await Promise.all([
      this.storage.getAllDeliveries(),
      this.storage.getAllRunEntries(),
      this.storage.getAllRuns(),
    ]);

    const runDateById = new Map<string, string>();
    runs.forEach((run) => {
      const raw = run.date ?? run.routeDate;
      if (!raw) return;
      runDateById.set(run.id, raw);
      dataYears.add(getEventYear(raw, now));
    });

    runEntries.forEach((entry) => {
      const raw = entry.eventDate ?? runDateById.get(entry.runId);
      if (!raw) return;
      dataYears.add(getEventYear(raw, now));
    });

    deliveries.forEach((delivery) => {
      if (delivery.status === 'delivered') {
        dataYears.add(getEventYear(delivery.deliveredAt, now));
      }
      (delivery.oneOffDonations ?? []).forEach((donation) => {
        dataYears.add(getEventYear(donation.date, now));
      });
      (delivery.oneOffDeliveries ?? []).forEach((entry) => {
        dataYears.add(getEventYear(entry.date, now));
      });
    });

    const earliestYear =
      dataYears.size > 0 ? Math.min(...dataYears) : currentYear;
    const latestYear =
      dataYears.size > 0 ? Math.max(...dataYears) : currentYear;
    this.setOneOffDateRange(earliestYear, latestYear);
  }

  private setOneOffDateRange(minYear: number, maxYear: number): void {
    this.oneOffMinYear = minYear;
    this.oneOffMaxYear = maxYear;
    this.oneOffDateMin = `${minYear}-01-01`;
    this.oneOffDateMax = `${maxYear}-12-31`;
    this.oneOffYearRangeLabel =
      minYear === maxYear ? `${minYear}` : `${minYear} and ${maxYear}`;
    if (this.oneOffDonationDateTouched) {
      this.oneOffDonationDateError = this.validateOneOffDate(
        this.oneOffDonationDate
      );
    }
    if (this.oneOffDeliveryDateTouched) {
      this.oneOffDeliveryDateError = this.validateOneOffDate(
        this.oneOffDeliveryDate
      );
    }
  }

  private resolveBaselineYear(fallbackYear: number): number {
    if (typeof localStorage === 'undefined') return fallbackYear;
    const raw = localStorage.getItem('lastImportAt');
    if (!raw) return fallbackYear;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime())
      ? fallbackYear
      : parsed.getFullYear();
  }

  private validateDonationSelection(
    donation: DonationInfo | null | undefined,
    options?: { allowNotRecorded?: boolean }
  ): string {
    const allowNotRecorded = options?.allowNotRecorded ?? false;
    if (!donation) {
      return allowNotRecorded ? '' : 'Select a donation type before saving.';
    }
    if (donation.status === 'NotRecorded') {
      return allowNotRecorded ? '' : 'Select a donation type before saving.';
    }
    if (donation.status === 'Donated' && !donation.method) {
      return 'Select a donation method before saving.';
    }
    return '';
  }

  private setOneOffDonationDate(value: string): void {
    this.oneOffDonationDate = value;
    this.oneOffDonationDateError = this.validateOneOffDate(value);
    if (this.donationDraft?.donation) {
      this.donationDraft.donation.date = value;
    }
  }

  private setOneOffDeliveryDate(value: string): void {
    this.oneOffDeliveryDate = value;
    this.oneOffDeliveryDateError = this.validateOneOffDate(value);
    if (this.offDonationDraft) {
      this.offDonationDraft.date = value;
    }
  }

  private setRunEntryDate(value: string): void {
    this.runEntryDate = value;
    this.runEntryDateError = this.validateOneOffDate(value);
  }

  private resetOneOffDonationDate(): void {
    this.oneOffDonationDate = '';
    this.oneOffDonationDateError = '';
    this.oneOffDonationDateTouched = false;
  }

  private resetOneOffDeliveryDate(): void {
    this.oneOffDeliveryDate = '';
    this.oneOffDeliveryDateError = '';
    this.oneOffDeliveryDateTouched = false;
  }

  private resetRunEntryDate(): void {
    this.runEntryDate = '';
    this.runEntryDateError = '';
  }

  private resetOneOffDonationTypeError(): void {
    this.oneOffDonationTypeError = '';
  }

  private resetOneOffDeliveryTypeError(): void {
    this.oneOffDeliveryTypeError = '';
  }

  private ensureOneOffDonationType(): boolean {
    const error = this.validateDonationSelection(this.donationDraft?.donation);
    this.oneOffDonationTypeError = error;
    return !error;
  }

  private ensureOneOffDeliveryType(): boolean {
    const error = this.validateDonationSelection(this.offDonationDraft, {
      allowNotRecorded: true
    });
    this.oneOffDeliveryTypeError = error;
    return !error;
  }

  private refreshOneOffDonationTypeError(): void {
    if (this.oneOffDonationTypeError) {
      this.oneOffDonationTypeError = this.validateDonationSelection(
        this.donationDraft?.donation
      );
    }
  }

  private refreshOneOffDeliveryTypeError(): void {
    if (this.oneOffDeliveryTypeError) {
      this.oneOffDeliveryTypeError = this.validateDonationSelection(
        this.offDonationDraft,
        { allowNotRecorded: true }
      );
    }
  }

  private resolveOneOffDonationTimestamp(): string {
    if (!this.oneOffDonationDateTouched) {
      return new Date().toISOString();
    }
    return this.oneOffDonationDate;
  }

  private resolveOneOffDeliveryTimestamp(): string {
    if (!this.oneOffDeliveryDateTouched) {
      return new Date().toISOString();
    }
    return this.oneOffDeliveryDate;
  }

  private ensureOneOffDonationDate(): boolean {
    const error = this.validateOneOffDate(this.oneOffDonationDate);
    this.oneOffDonationDateError = error;
    return !error;
  }

  private ensureOneOffDeliveryDate(): boolean {
    const error = this.validateOneOffDate(this.oneOffDeliveryDate);
    this.oneOffDeliveryDateError = error;
    return !error;
  }

  private ensureRunEntryDate(): boolean {
    const error = this.validateOneOffDate(this.runEntryDate);
    this.runEntryDateError = error;
    return !error;
  }

  onOneOffDonationDateChange(value: string): void {
    this.oneOffDonationDateTouched = true;
    this.setOneOffDonationDate(value);
  }

  onOneOffDeliveryDateChange(value: string): void {
    this.oneOffDeliveryDateTouched = true;
    this.setOneOffDeliveryDate(value);
  }

  onRunEntryDateChange(value: string): void {
    this.setRunEntryDate(value);
  }

  startSwipe(event: PointerEvent, stop: Delivery): void {
    this.swipeStartX = event.clientX;
    this.swipeStartY = event.clientY;
    this.swipeMode = 'none';
    this.isSwiping = false;
  }

  openOffScheduleDelivery(stop: Delivery): void {
    this.closeSwipe();
    console.log('openOffScheduleDelivery fired for', stop.id);
    this.offScheduleStop = stop;
    const rate = this.storage.getSuggestedRate();
    const suggested = (stop.dozens ?? 0) * rate;
    const today = this.getTodayDateInput();
    this.oneOffDeliveryDateTouched = false;
    this.offDonationDraft = {
      status: stop.donation?.status ?? 'NotRecorded',
      method: stop.donation?.method,
      amount: stop.donation?.amount ?? suggested,
      suggestedAmount: suggested,
      date: today,
    };
    this.setOneOffDeliveryDate(today);
    this.resetOneOffDeliveryTypeError();
    this.offDeliveredQty = stop.deliveredDozens ?? stop.dozens ?? 0;
    // Seed totals based on the current stop so the overlay has
    // sensible values immediately; full global totals will be
    // refreshed after save.
    this.donationTotals = this.computeOneOffTotals(stop, this.syncSelectedTaxYear());
    void this.loadReceiptHistory(stop);
  }

  closeOffSchedule(showToast = false): void {
    if (showToast && this.offScheduleStop) {
      this.toast.show(
        `Delivery edit cancelled for ${this.offScheduleStop.name}`,
        'error',
        2600
      );
    }
    this.offScheduleStop = null;
    this.offDonationDraft = null;
    this.offDeliveredQty = 0;
    this.pickerMode = null;
    this.resetOneOffDeliveryDate();
    this.resetOneOffDeliveryTypeError();
    this.clearReceiptHistory();
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
    this.refreshOneOffDeliveryTypeError();
  }

  setOffDonationMethod(method: 'cash' | 'venmo' | 'ach' | 'paypal' | 'other'): void {
    if (!this.offDonationDraft) return;
    this.offDonationDraft.status = 'Donated';
    this.offDonationDraft.method = method;
    if (this.offDonationDraft.amount == null) {
      this.offDonationDraft.amount = this.offDonationDraft.suggestedAmount ?? 0;
    }
    this.refreshOneOffDeliveryTypeError();
  }

  adjustOffDelivered(delta: number): void {
    const prev = this.offDeliveredQty || 0;
    const prevSuggested =
      this.offDonationDraft?.suggestedAmount ?? prev * 4;
    const next = Math.max(0, prev + delta);
    this.offDeliveredQty = next;
    if (this.offDonationDraft) {
      this.offDonationDraft.suggestedAmount = next * 4;
      if (this.offDonationDraft.status === 'Donated') {
        if (
          this.offDonationDraft.amount == null ||
          this.offDonationDraft.amount === prevSuggested
        ) {
          this.offDonationDraft.amount = next * 4;
        }
      }
    }
  }

  async saveOffSchedule(): Promise<void> {
    if (!this.offScheduleStop || !this.offDonationDraft) {
      this.closeOffSchedule();
      return;
    }
    if (!this.ensureOneOffDeliveryDate()) return;
    if (!this.ensureOneOffDeliveryType()) return;
    const stop = this.offScheduleStop;
    const donation = {
      ...this.offDonationDraft,
      date: this.resolveOneOffDeliveryTimestamp()
    };
    await this.storage.appendOneOffDelivery(
      stop.id,
      this.offDeliveredQty || stop.dozens,
      donation
    );
    this.toast.show('Delivery saved');
    await this.loadDeliveries();
    this.closeOffSchedule();
  }

  openOffAmountInput(): void {
    // inline picker handles selection; keep handler for compatibility
  }

  onOffAmountChange(amount: number): void {
    if (!this.offDonationDraft) return;
    const nextAmount = Math.max(0, Number(amount) || 0);
    if (nextAmount > 0 || this.offDonationDraft.status === 'Donated') {
      this.offDonationDraft.status = 'Donated';
    }
    this.offDonationDraft.amount = nextAmount;
    this.offDonationDraft.date =
      this.oneOffDeliveryDate || this.offDonationDraft.date;
    this.offDonationDraft.suggestedAmount =
      this.offDonationDraft.suggestedAmount ?? this.offDeliveredQty * 4;
    this.refreshOneOffDeliveryTypeError();
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
    const address = `${target.address}, ${target.city}, ${
      target.state
    } ${target.zip ?? ''}`.trim();
    const encoded = encodeURIComponent(address);

    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      // iOS: use maps:// so the system picks the Maps app.
      if (/iPad|iPhone|iPod/.test(ua)) {
        this.navigateToUrl(`maps://?q=${encoded}`);
        return;
      }
      // Android: use geo: so the system chooser/default app handles it.
      if (/Android/i.test(ua)) {
        this.navigateToUrl(`geo:0,0?q=${encoded}`);
        return;
      }
    }

    // Fallback for desktop/unknown: open web Maps.
    this.navigateToUrl(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`
    );
  }

  private navigateToUrl(url: string): void {
    window.location.assign(url);
  }

  moveSwipe(event: PointerEvent, stop: Delivery): void {
    if (this.swipeStartX === null || this.swipeStartY === null) return;
    const dx = event.clientX - this.swipeStartX;
    const dy = event.clientY - this.swipeStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Decide mode once per gesture.
    if (this.swipeMode === 'none') {
      const threshold = 3;
      // Extremely strong bias toward horizontal swipe: only lock to swipe; otherwise
      // leave it to the browser to handle vertical scrolling.
      if (absDx > threshold && absDx >= absDy) {
        this.swipeMode = 'swipe';
        this.isSwiping = true;
      }
    }

    if (this.swipeMode === 'swipe') {
      // Prevent vertical scroll once we've locked into swipe.
      event.preventDefault();
    }
  }

  endSwipe(event: PointerEvent, stop: Delivery): void {
    if (this.swipeStartX === null) return;
    const deltaX = event.clientX - this.swipeStartX;
    if (this.swipeMode === 'swipe') {
      if (deltaX < -this.swipeThreshold) {
        this.openRowId = stop.id;
        // Close any open inline donation/delivery when a row's
        // action menu is revealed via swipe.
        if (this.donationModalStop || this.offScheduleStop) {
          this.closeDonationModal(true);
          this.closeOffSchedule(true);
        }
      } else if (deltaX > this.swipeThreshold) {
        this.openRowId = null;
      }
    }
    this.swipeStartX = null;
    this.swipeStartY = null;
    this.swipeMode = 'none';
    this.isSwiping = false;
  }

  toggleRow(stop: Delivery): void {
    if (this.isSwiping) return;
    if (this.editingStop) {
      this.editingStop = null;
    }
    const willOpen = this.openRowId !== stop.id;
    this.openRowId = willOpen ? stop.id : null;
    if (willOpen && (this.donationModalStop || this.offScheduleStop)) {
      // Tapping to open the hidden menu should behave like pressing
      // Cancel on any open donation/delivery editor.
      this.closeDonationModal(true);
      this.closeOffSchedule(true);
    }
  }

  onBackActionClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
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
    if (!(Number(this.newDelivery.deliveryOrder) > 0)) {
      errors.push('Order must be at least 1.');
    }
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
    const nextOrder = this.deliveries.length + 1;
    this.newDelivery = {
      deliveryOrder: nextOrder,
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
    this.syncSelectedTaxYear();
    this.routes = await this.storage.getRoutes();
    this.allRuns = await this.storage.getAllRuns();
    this.routeDate = this.route.snapshot.paramMap.get('routeDate') || undefined;
    if (!this.routeDate) {
      this.routeDate = await this.pickFallbackRoute();
    }
    // Initialize reorder mode from persisted setting.
    const storedReorder = localStorage.getItem('plannerReorderEnabled');
    this.reorderEnabled = storedReorder === 'true';
    await this.loadRunsForRoute();
    this.newDelivery.routeDate = this.routeDate ?? '';
    if (this.routeDate) {
      this.selectedRouteOrRun = `route:${this.routeDate}`;
    } else {
      this.selectedRouteOrRun = null;
    }
    if (!this.routeDate) {
      this.errorMessage = 'No route selected.';
      this.loading = false;
      return;
    }
    await this.loadDeliveries();
    await this.refreshOneOffDateRange();
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
      let fetched: Delivery[] = [];
      if (this.routeDate === this.ALL_SCHEDULES) {
        const all = await this.storage.getAllDeliveries();
        fetched = all.sort((a, b) => {
          const nameA = (a.name || '').toLocaleLowerCase();
          const nameB = (b.name || '').toLocaleLowerCase();
          const nameCmp = nameA.localeCompare(nameB);
          if (nameCmp !== 0) return nameCmp;
          const dateCmp = (a.routeDate || '').localeCompare(b.routeDate || '');
          if (dateCmp !== 0) return dateCmp;
          return (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
        });
      } else {
        fetched = await this.storage.getDeliveriesByRoute(this.routeDate);
      }
      this.deliveries = fetched.map((d) => this.normalizeDelivery(d));
      this.applyFilter(false);
      await this.loadRunsForRoute();
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
    if (stop.originalDozens == null) {
      stop.originalDozens = stop.dozens;
    }
    await this.storage.updatePlannedDozens(stop.id, dozens);
    stop.dozens = dozens;
    stop.deliveredDozens = undefined;
    stop.updatedAt = new Date().toISOString();
    if (stop.donation) {
      stop.donation.suggestedAmount = dozens * 4;
    }
    stop.status = this.storage.computeChangeStatus(stop);
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
    if (this.isUnsubscribed(stop)) {
      await this.resubscribeStop(stop);
      return;
    }
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
      this.selectedRouteOrRun = null;
      return;
    }
    this.routeDate = routeDate;
    if (routeDate !== this.ALL_SCHEDULES) {
      this.persistRouteSelection();
    }
    this.selectedRouteOrRun = `route:${routeDate}`;
    void this.loadDeliveries();
  }

  private persistRouteSelection(): void {
    if (this.routeDate && this.routeDate !== this.ALL_SCHEDULES) {
      localStorage.setItem('currentRoute', this.routeDate);
      localStorage.setItem('lastSelectedRoute', this.routeDate);
    }
  }

  getDonationPillLabel(stop: Delivery): string {
    const suggested = (stop.dozens ?? 0) * this.storage.getSuggestedRate();
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
    const rate = this.storage.getSuggestedRate();
    const today = this.getTodayDateInput();
    this.oneOffDonationDateTouched = false;
    // shallow clone to edit
    this.donationDraft = {
      ...stop,
      donation: {
        status: stop.donation?.status ?? 'NotRecorded',
        method: stop.donation?.method,
        amount: stop.donation?.amount,
        suggestedAmount: (stop.dozens ?? 0) * rate,
        date: today,
        note: stop.donation?.note,
      },
    };
    this.setOneOffDonationDate(today);
    this.resetOneOffDonationTypeError();
    // Seed totals based on the current stop so the overlay has
    // sensible values immediately; full global totals will be
    // refreshed after save.
    this.donationTotals = this.computeOneOffTotals(stop, this.syncSelectedTaxYear());
    void this.refreshDonationTotals(stop);
    void this.loadReceiptHistory(stop);
  }

  closeDonationModal(showToast = false): void {
    if (showToast && this.donationModalStop) {
      this.toast.show(
        `Donation edit cancelled for ${this.donationModalStop.name}`,
        'error',
        2600
      );
    }
    this.donationModalStop = null;
    this.donationDraft = undefined;
    this.showAmountPicker = false;
    this.pickerMode = null;
    this.resetOneOffDonationDate();
    this.resetOneOffDonationTypeError();
    this.clearReceiptHistory();
  }

  onDonationQtyChange(qty: number): void {
    if (!this.donationDraft) return;
    const rate = this.storage.getSuggestedRate();
    const safeQty = Math.max(0, Number(qty) || 0);
    this.donationDraft.dozens = safeQty;
    const donation =
      this.donationDraft.donation ??
      ({
        status: 'NotRecorded',
        suggestedAmount: safeQty * rate
      } as DonationInfo);
    const previousSuggested = donation.suggestedAmount ?? safeQty * rate;
    donation.suggestedAmount = safeQty * rate;
    // If amount hasn't been customized yet, keep it tied to suggested.
    if (
      donation.amount == null ||
      donation.amount === previousSuggested
    ) {
      donation.amount = donation.suggestedAmount;
    }
    this.donationDraft.donation = donation;
  }

  saveDonation(): void {
    if (!this.donationModalStop || !this.donationDraft?.donation) {
      this.closeDonationModal();
      return;
    }
    if (!this.ensureOneOffDonationDate()) return;
    if (!this.ensureOneOffDonationType()) return;
    const donation = this.donationDraft.donation;
    donation.suggestedAmount = (this.donationModalStop.dozens ?? 0) * this.storage.getSuggestedRate();
    donation.date = this.resolveOneOffDonationTimestamp();
    void this.storage.appendOneOffDonation(this.donationModalStop.id, donation);
    this.toast.show('Donation saved');
    if (this.donationModalStop) {
      const list = Array.isArray(this.donationModalStop.oneOffDonations)
        ? [...this.donationModalStop.oneOffDonations]
        : [];
      list.push(donation);
      this.donationModalStop.oneOffDonations = list;
      void this.refreshDonationTotals(this.donationModalStop);
    }
    this.closeDonationModal();
  }

  private async loadReceiptHistory(stop: Delivery): Promise<void> {
    const baseRowId = stop.baseRowId;
    const taxYear = this.syncSelectedTaxYear();
    this.receiptHistoryBaseRowId = baseRowId;
    this.receiptHistoryLoading = true;
    this.receiptHistory = [];
    try {
      const entries = await this.storage.getReceiptHistoryByBaseRowId(baseRowId, taxYear);
      if (this.receiptHistoryBaseRowId === baseRowId) {
        this.receiptHistory = entries;
      }
    } catch (err) {
      console.error('Failed to load receipt history', err);
      if (this.receiptHistoryBaseRowId === baseRowId) {
        this.receiptHistory = [];
      }
    } finally {
      if (this.receiptHistoryBaseRowId === baseRowId) {
        this.receiptHistoryLoading = false;
      }
    }
  }

  private clearReceiptHistory(): void {
    this.receiptHistoryBaseRowId = null;
    this.receiptHistoryLoading = false;
    this.receiptHistory = [];
  }

  formatReceiptStatus(status: ReceiptHistoryEntry['status']): string {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'skipped':
        return 'Skipped';
      case 'donation':
        return 'Donation';
      default:
        return 'Receipt';
    }
  }

  formatReceiptDozens(entry: ReceiptHistoryEntry): string {
    const dozens = Math.max(0, Number(entry.dozens) || 0);
    return `${dozens} dozen${dozens === 1 ? '' : 's'}`;
  }

  formatReceiptDonationMethod(method?: DonationMethod): string {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'venmo':
        return 'Venmo';
      case 'ach':
        return 'ACH';
      case 'paypal':
        return 'PayPal';
      case 'other':
        return 'Other';
      default:
        return 'Donated';
    }
  }

  canDeleteReceiptHistoryEntry(entry: ReceiptHistoryEntry): boolean {
    if (entry.kind === 'run') {
      return !!entry.runEntryId;
    }
    if (
      entry.kind === 'oneOffDonation' ||
      entry.kind === 'oneOffDelivery'
    ) {
      return !!entry.deliveryId && entry.oneOffIndex != null;
    }
    return false;
  }

  getReceiptHistoryDeleteLabel(entry: ReceiptHistoryEntry): string {
    const date = this.formatReceiptDateLabel(entry.date);
    const status = this.formatReceiptStatus(entry.status).toLowerCase();
    return `Delete ${status} receipt from ${date}`;
  }

  async confirmDeleteReceiptHistory(
    entry: ReceiptHistoryEntry
  ): Promise<void> {
    if (!this.canDeleteReceiptHistoryEntry(entry)) return;
    const label = this.getReceiptHistoryDeleteLabel(entry);
    const confirmed = window.confirm(
      `${label}?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await this.deleteReceiptHistoryEntry(entry);
      this.toast.show('Receipt deleted');
      const stop = this.getReceiptHistoryStop();
      if (stop) {
        await this.loadReceiptHistory(stop);
        await this.refreshDonationTotals(stop);
      }
    } catch (err) {
      console.error('Failed to delete receipt', err);
      this.toast.show('Failed to delete receipt', 'error');
    }
  }

  canDeleteRunEntry(entry: RunSnapshotEntry): boolean {
    if (entry.runId === 'oneoff') {
      return (
        !!entry.deliveryId &&
        entry.oneOffIndex != null &&
        !!entry.oneOffKind
      );
    }
    return !!entry.id;
  }

  getRunEntryDeleteLabel(entry: RunSnapshotEntry): string {
    const date = this.formatReceiptDateLabel(entry.eventDate ?? '');
    const status = this.formatReceiptStatus(entry.status).toLowerCase();
    const name = entry.name?.trim() ? ` for ${entry.name}` : '';
    return `Delete ${status} receipt${name} from ${date}`;
  }

  async confirmDeleteRunEntry(entry: RunSnapshotEntry): Promise<void> {
    if (!this.canDeleteRunEntry(entry)) return;
    const label = this.getRunEntryDeleteLabel(entry);
    const confirmed = window.confirm(
      `${label}?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await this.deleteRunEntry(entry);
      this.toast.show('Receipt deleted');
      if (this.editingRunEntry?.id === entry.id) {
        this.cancelRunEntryEdit();
      }
      await this.reloadRunEntriesView();
      this.applyFilter(false);
    } catch (err) {
      console.error('Failed to delete receipt', err);
      this.toast.show('Failed to delete receipt', 'error');
    }
  }

  private formatReceiptDateLabel(date?: string): string {
    if (!date) return 'No date';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.valueOf())) return 'No date';
    return parsed.toLocaleDateString('en-US');
  }

  private getReceiptHistoryStop(): Delivery | null {
    return this.donationModalStop ?? this.offScheduleStop ?? null;
  }

  private async deleteReceiptHistoryEntry(
    entry: ReceiptHistoryEntry
  ): Promise<void> {
    if (entry.kind === 'run' && entry.runEntryId) {
      await this.storage.deleteRunEntry(entry.runEntryId);
      return;
    }
    if (
      entry.kind === 'oneOffDonation' &&
      entry.deliveryId &&
      entry.oneOffIndex != null
    ) {
      await this.storage.deleteOneOffDonationByIndex(
        entry.deliveryId,
        entry.oneOffIndex
      );
      return;
    }
    if (
      entry.kind === 'oneOffDelivery' &&
      entry.deliveryId &&
      entry.oneOffIndex != null
    ) {
      await this.storage.deleteOneOffDeliveryByIndex(
        entry.deliveryId,
        entry.oneOffIndex
      );
    }
  }

  private async deleteRunEntry(entry: RunSnapshotEntry): Promise<void> {
    if (entry.runId === 'oneoff') {
      if (
        entry.oneOffKind === 'donation' &&
        entry.deliveryId &&
        entry.oneOffIndex != null
      ) {
        await this.storage.deleteOneOffDonationByIndex(
          entry.deliveryId,
          entry.oneOffIndex
        );
      } else if (
        entry.oneOffKind === 'delivery' &&
        entry.deliveryId &&
        entry.oneOffIndex != null
      ) {
        await this.storage.deleteOneOffDeliveryByIndex(
          entry.deliveryId,
          entry.oneOffIndex
        );
      }
      return;
    }
    if (entry.id) {
      await this.storage.deleteRunEntry(entry.id);
    }
  }

  private async reloadRunEntriesView(): Promise<void> {
    if (this.viewingAllReceipts) {
      await this.loadAllReceipts();
      this.filteredRunEntries = [...this.runEntries];
      return;
    }
    if (!this.selectedRunId) return;
    const run =
      this.allRuns.find((r) => r.id === this.selectedRunId) ?? null;
    const entries = await this.storage.getRunEntries(this.selectedRunId);
    this.runEntries = entries
      .slice()
      .sort(
        (a, b) =>
          (a.deliveryOrder ?? 0) - (b.deliveryOrder ?? 0)
      )
      .map((e) => ({
        ...e,
        eventDate: e.eventDate ?? run?.date
      }));
    this.filteredRunEntries = [...this.runEntries];
  }

  setDonationStatus(status: 'NotRecorded' | 'Donated' | 'NoDonation'): void {
    if (!this.donationDraft) return;
    const rate = this.storage.getSuggestedRate();
    const donation = this.donationDraft.donation ?? {
      status: 'NotRecorded',
      suggestedAmount: (this.donationDraft.dozens ?? 0) * rate,
    };
    donation.status = status;
    if (status === 'NoDonation') {
      donation.method = undefined;
      donation.amount = 0;
    } else if (status === 'NotRecorded') {
      donation.method = undefined;
      donation.amount = undefined;
    }
    donation.suggestedAmount = (this.donationDraft.dozens ?? 0) * rate;
    this.donationDraft.donation = donation;
    this.refreshOneOffDonationTypeError();
  }

  setDonationMethod(method: 'cash' | 'venmo' | 'ach' | 'paypal' | 'other'): void {
    if (!this.donationDraft) return;
    const rate = this.storage.getSuggestedRate();
    const donation = this.donationDraft.donation ?? {
      status: 'NotRecorded',
      suggestedAmount: (this.donationDraft.dozens ?? 0) * rate,
    };
    donation.status = 'Donated';
    donation.method = method;
    donation.suggestedAmount = (this.donationDraft.dozens ?? 0) * rate;
    if (donation.amount == null) {
      donation.amount = donation.suggestedAmount;
    }
    this.donationDraft.donation = donation;
    this.refreshOneOffDonationTypeError();
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
      this.offDonationDraft.date =
        this.oneOffDeliveryDate || this.offDonationDraft.date;
      this.refreshOneOffDeliveryTypeError();
    } else {
      if (!this.donationDraft) return;
      const donation = this.donationDraft.donation ?? {
        status: 'Donated',
        suggestedAmount: (this.donationDraft.dozens ?? 0) * 4,
      };
      donation.status = 'Donated';
      donation.amount = amount;
      donation.date = this.oneOffDonationDate || donation.date;
      donation.suggestedAmount = (this.donationDraft.dozens ?? 0) * 4;
      this.donationDraft.donation = donation;
      this.refreshOneOffDonationTypeError();
    }
    this.showAmountPicker = false;
    this.pickerMode = null;
  }

  onDonationAmountChange(amount: number): void {
    if (!this.donationDraft?.donation) return;
    const donation = this.donationDraft.donation;
    const nextAmount = Math.max(0, Number(amount) || 0);
    if (nextAmount > 0 || donation.status === 'Donated') {
      donation.status = 'Donated';
    }
    donation.amount = nextAmount;
    donation.date = this.oneOffDonationDate || donation.date;
    donation.suggestedAmount = (this.donationDraft.dozens ?? 0) * 4;
    this.donationDraft.donation = donation;
    this.refreshOneOffDonationTypeError();
  }

  openEdit(stop: Delivery): void {
    this.closeSwipe();
    this.editingStop = stop;
    this.editDraft = {
      deliveryOrder: (stop.deliveryOrder ?? stop.sortIndex ?? 0) + 1,
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

  toggleReorder(): void {
    this.reorderEnabled = !this.reorderEnabled;
  }

  openRunEntryEdit(entry: RunSnapshotEntry): void {
    this.editingRunEntry = entry;
    this.runEntryDraft = {
      status: entry.status,
      dozens: entry.dozens,
      deliveryOrder: (entry.deliveryOrder ?? 0) + 1,
      donationStatus: entry.donationStatus,
      donationMethod: entry.donationMethod ?? '',
      donationAmount: entry.donationAmount,
    };
    this.resetRunEntryDate();
    if (entry.runId === 'oneoff' && entry.deliveryId && entry.oneOffIndex != null) {
      const dateValue = this.formatEventDateForInput(entry.eventDate);
      this.setRunEntryDate(dateValue);
      void this.loadOneOffSuggested(entry);
    }
  }

  private async loadOneOffSuggested(entry: RunSnapshotEntry): Promise<void> {
    if (!entry.deliveryId && entry.oneOffIndex == null) return;
    const currentDraft = this.runEntryDraft;
    if (!currentDraft || this.editingRunEntry?.id !== entry.id) return;
    const delivery = await this.storage.getDeliveryById(entry.deliveryId!);
    if (!delivery) return;
    let suggested: number | undefined;
    if (entry.oneOffKind === 'donation') {
      const d = delivery.oneOffDonations?.[entry.oneOffIndex!];
      suggested = d?.suggestedAmount;
    } else if (entry.oneOffKind === 'delivery') {
      const e = delivery.oneOffDeliveries?.[entry.oneOffIndex!];
      suggested = e?.donation?.suggestedAmount;
    }
    if (suggested != null && this.editingRunEntry?.id === entry.id && this.runEntryDraft) {
      this.runEntryDraft = {
        ...this.runEntryDraft,
        suggestedAmount: suggested
      };
    }
  }

  async onRouteOrRunChange(key: string | null): Promise<void> {
    this.selectedRouteOrRun = key;
    this.editingRunEntry = null;
    this.runEntryDraft = null;
    this.resetRunEntryDate();

    if (!key) {
      this.routeDate = undefined;
      this.viewingRun = false;
      this.viewingAllReceipts = false;
      this.selectedRunId = 'live';
      this.deliveries = [];
      this.filteredDeliveries = [];
      this.runEntries = [];
      this.filteredRunEntries = [];
      localStorage.removeItem('currentRunId');
      return;
    }

    if (key === this.ALL_SCHEDULES || key.startsWith('route:')) {
      // Live route selection.
      const route =
        key === this.ALL_SCHEDULES ? this.ALL_SCHEDULES : key.slice('route:'.length);
      this.routeDate = route === this.ALL_SCHEDULES ? this.ALL_SCHEDULES : route;
      if (this.routeDate && this.routeDate !== this.ALL_SCHEDULES) {
        this.persistRouteSelection();
        localStorage.removeItem('currentRunId');
      }
      this.viewingRun = false;
      this.viewingAllReceipts = false;
      this.selectedRunId = 'live';
      this.runEntries = [];
      this.filteredRunEntries = [];
      await this.loadDeliveries();
      return;
    }

    if (key === 'receipts:all') {
      this.viewingRun = true;
      this.viewingAllReceipts = true;
      this.selectedRunId = null;
      // Sentinel so the header can show an All receipts summary.
      localStorage.setItem('currentRunId', '__ALL_RECEIPTS__');
      await this.loadAllReceipts();
      this.filteredRunEntries = [...this.runEntries];
      return;
    }

    if (key.startsWith('run:')) {
      const runId = key.slice('run:'.length);
      this.selectedRunId = runId;
      this.viewingRun = true;
      this.viewingAllReceipts = false;
      localStorage.setItem('currentRunId', runId);
      const run =
        this.allRuns.find((r) => r.id === runId) ?? null;
      if (run?.routeDate) {
        this.routeDate = run.routeDate;
      }
      const entries = await this.storage.getRunEntries(runId);
      this.runEntries = entries
        .slice()
        .sort(
          (a, b) =>
            (a.deliveryOrder ?? 0) - (b.deliveryOrder ?? 0)
        )
        .map((e) => ({
          ...e,
          eventDate: e.eventDate ?? run?.date
        }));
      this.filteredRunEntries = [...this.runEntries];
      return;
    }
  }

  cancelRunEntryEdit(): void {
    this.editingRunEntry = null;
    this.runEntryDraft = null;
    this.resetRunEntryDate();
  }

  private computeRunEntryTaxable(
    dozens: number,
    status: DonationStatus,
    amount: number
  ): number {
    if (status !== 'Donated') return 0;
    const suggested = dozens * this.storage.getSuggestedRate();
    const actual = Number.isFinite(amount) ? amount : suggested;
    const extra = actual - suggested;
    return extra > 0 ? extra : 0;
  }

  private async loadAllReceipts(): Promise<void> {
    const now = new Date();
    const taxYear = this.syncSelectedTaxYear();
    const [runs, entries, deliveries] = await Promise.all([
      this.storage.getAllRuns(),
      this.storage.getAllRunEntries(),
      this.storage.getAllDeliveries()
    ]);

    const runDateById = new Map<string, string>();
    runs.forEach((r) => {
      if (r.id && r.date) {
        runDateById.set(r.id, r.date);
      }
    });

    type ReceiptKind = 'run' | 'oneOffDonation' | 'oneOffDelivery';
    interface Receipt {
      kind: ReceiptKind;
      date: string;
      baseRowId: string;
      name: string;
      address: string;
      city: string;
      state: string;
      zip?: string;
      status: 'delivered' | 'skipped' | 'donation';
      dozens: number;
      donationStatus: DonationStatus;
      donationMethod?: DonationMethod;
      donationAmount: number;
      taxableAmount: number;
      // For historical run entries
      runId?: string;
      runEntryId?: string;
      // For one-off receipts
      deliveryId?: string;
      oneOffKind?: 'donation' | 'delivery';
      oneOffIndex?: number;
    }

    const receipts: Receipt[] = [];

    // Runs-first receipts.
    entries.forEach((entry) => {
      const date =
        normalizeEventDate(entry.eventDate ?? runDateById.get(entry.runId)) ??
        '';
      receipts.push({
        kind: 'run',
        date,
        baseRowId: entry.baseRowId,
        name: entry.name,
        address: entry.address,
        city: entry.city,
        state: entry.state,
        zip: entry.zip,
        status: entry.status,
        dozens: entry.dozens,
        donationStatus: entry.donationStatus,
        donationMethod: entry.donationMethod as DonationMethod | undefined,
        donationAmount: entry.donationAmount,
        taxableAmount: entry.taxableAmount,
        runId: entry.runId,
        runEntryId: entry.id
      });
    });

    // One-off receipts.
    deliveries.forEach((d) => {
      const baseRowId = d.baseRowId;
      const name = d.name;
      const address = d.address;
      const city = d.city;
      const state = d.state;
      const zip = d.zip;

      (d.oneOffDonations ?? []).forEach((don, index) => {
        const date = normalizeEventDate(don.date) ?? '';
        const suggested = Number(don.suggestedAmount ?? 0);
        const amount = Number(don.amount ?? suggested);
        const taxable =
          don.taxableAmount ??
          Math.max(0, amount - suggested);
        receipts.push({
          kind: 'oneOffDonation',
          date,
          baseRowId,
          name,
          address,
          city,
          state,
          zip,
          status: 'donation',
          dozens: 0,
          donationStatus: don.status as DonationStatus,
          donationMethod: don.method as DonationMethod | undefined,
          donationAmount: amount,
          taxableAmount: taxable,
          deliveryId: d.id,
          oneOffKind: 'donation',
          oneOffIndex: index
        });
      });

      (d.oneOffDeliveries ?? []).forEach((entry, index) => {
        const date = normalizeEventDate(entry.date) ?? '';
        const deliveredDozens = Number(entry.deliveredDozens ?? 0);
        const don = entry.donation;
        const suggested = Number(don?.suggestedAmount ?? 0);
        const amount = Number(don?.amount ?? suggested);
        const taxable =
          don?.taxableAmount ??
          Math.max(0, amount - suggested);
        receipts.push({
          kind: 'oneOffDelivery',
          date,
          baseRowId,
          name,
          address,
          city,
          state,
          zip,
          status: 'delivered',
          dozens: deliveredDozens,
          donationStatus: (don?.status ?? 'NotRecorded') as DonationStatus,
          donationMethod: don?.method as DonationMethod | undefined,
          donationAmount: amount,
          taxableAmount: taxable,
          deliveryId: d.id,
          oneOffKind: 'delivery',
          oneOffIndex: index
        });
      });
    });

    const targetYear = Number.isFinite(taxYear) ? Math.trunc(taxYear) : undefined;
    const filteredReceipts = targetYear == null
      ? receipts
      : receipts.filter(
          (receipt) => getEventYear(receipt.date, now) === targetYear
        );

    // Sort newest-first by date.
    filteredReceipts.sort(
      (a, b) => toSortableTimestamp(b.date) - toSortableTimestamp(a.date)
    );

    // Project into RunSnapshotEntry-shaped view list.
    const viewEntries: RunSnapshotEntry[] = filteredReceipts.map((r, index) => {
      const generatedId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `receipt_${index}_${r.baseRowId}`;
      return {
        id: r.runEntryId ?? generatedId,
        runId: r.kind === 'run' ? (r.runId ?? 'run') : 'oneoff',
        baseRowId: r.baseRowId,
        name: r.name,
        address: r.address,
        city: r.city,
        state: r.state,
        zip: r.zip,
        status: r.status,
        dozens: r.dozens,
        deliveryOrder: index,
        donationStatus: r.donationStatus,
        donationMethod: r.donationMethod,
        donationAmount: r.donationAmount,
        taxableAmount: r.taxableAmount,
        eventDate: r.date,
        deliveryId: r.deliveryId,
        oneOffKind: r.oneOffKind,
        oneOffIndex: r.oneOffIndex
      };
    });

    this.runEntries = viewEntries;
    this.filteredRunEntries = [...viewEntries];
  }

  async saveRunEntryEdit(): Promise<void> {
    if (!this.editingRunEntry || !this.runEntryDraft) return;
    const original = this.editingRunEntry;
    const draft = this.runEntryDraft;

    const newDozens = Math.max(0, Number(draft.dozens) || 0);
    const newAmount = Math.max(0, Number(draft.donationAmount) || 0);
    const taxable = this.computeRunEntryTaxable(
      newDozens,
      draft.donationStatus,
      newAmount
    );

    if (original.runId === 'oneoff') {
      // Editing a one-off receipt: update the underlying one-off record on the delivery,
      // then reload the All receipts view so the change is reflected everywhere.
      if (!this.ensureRunEntryDate()) {
        return;
      }
      const suggested =
        this.runEntryDraft.suggestedAmount != null
          ? Number(this.runEntryDraft.suggestedAmount) || 0
          : undefined;
      if (original.oneOffKind === 'donation' && original.deliveryId != null && original.oneOffIndex != null) {
        await this.storage.updateOneOffDonationByIndex(original.deliveryId, original.oneOffIndex, {
          donationStatus: draft.donationStatus,
          donationMethod: draft.donationMethod || undefined,
          donationAmount: newAmount,
          suggestedAmount: suggested,
          date: this.runEntryDate
        });
      } else if (original.oneOffKind === 'delivery' && original.deliveryId != null && original.oneOffIndex != null) {
        await this.storage.updateOneOffDeliveryByIndex(original.deliveryId, original.oneOffIndex, {
          dozens: newDozens,
          donationStatus: draft.donationStatus,
          donationMethod: draft.donationMethod || undefined,
          donationAmount: newAmount,
          suggestedAmount: suggested,
          date: this.runEntryDate
        });
      }
      await this.loadAllReceipts();
      this.applyFilter(false);
    } else if (this.viewingAllReceipts) {
      // Editing a historical run entry from the All receipts view:
      // update just that entry in the runEntries table and refresh receipts.
      await this.storage.updateRunEntry(original.id, {
        dozens: newDozens,
        donationStatus: draft.donationStatus,
        donationMethod:
          draft.donationStatus === 'Donated'
            ? (draft.donationMethod || undefined)
            : undefined,
        donationAmount:
          draft.donationStatus === 'Donated' ? newAmount : 0,
        taxableAmount: taxable,
        status: draft.status
      });
      await this.loadAllReceipts();
      this.applyFilter(false);
    } else {
      // Editing a historical run entry: update runEntries table and reorder within the run.
      const requestedOrderRaw = draft.deliveryOrder || 1;
      const maxOrder = this.runEntries.length || 1;
      const requestedOrder = Math.min(
        Math.max(1, requestedOrderRaw),
        maxOrder
      );

      const entries = this.runEntries.slice();
      const idx = entries.findIndex((e) => e.id === original.id);
      if (idx !== -1) {
        const [removed] = entries.splice(idx, 1);
        entries.splice(requestedOrder - 1, 0, removed);
        entries.forEach((e, i) => {
          e.deliveryOrder = i;
          if (e.id === original.id) {
            e.dozens = newDozens;
            e.donationStatus = draft.donationStatus;
            e.donationMethod =
              draft.donationStatus === 'Donated'
                ? (draft.donationMethod || undefined)
                : undefined;
            e.donationAmount =
              draft.donationStatus === 'Donated' ? newAmount : 0;
            e.taxableAmount = taxable;
            e.status = draft.status;
          }
        });
        this.runEntries = entries;
        await this.storage.saveRunEntryOrdering(
          original.runId,
          entries
        );
        await this.storage.updateRunEntry(original.id, {
          dozens: newDozens,
          donationStatus: draft.donationStatus,
          donationMethod:
            draft.donationStatus === 'Donated'
              ? (draft.donationMethod || undefined)
              : undefined,
          donationAmount:
            draft.donationStatus === 'Donated' ? newAmount : 0,
          taxableAmount: taxable,
          status: draft.status,
          deliveryOrder:
            requestedOrder - 1,
        });
      }
    }

    this.editingRunEntry = null;
    this.runEntryDraft = null;
    this.resetRunEntryDate();
  }

  private getScheduleId(routeDate: string): string {
    return routeDate.replace(/\s+/g, '') || 'Schedule';
  }

  private async loadRunsForRoute(): Promise<void> {
    if (!this.routeDate || this.routeDate === this.ALL_SCHEDULES) {
      this.runOptions = [];
      this.selectedRunId = 'live';
      this.viewingRun = false;
      return;
    }
    const scheduleId = this.getScheduleId(this.routeDate);
    this.runOptions = await this.storage.getRunsForSchedule(scheduleId);
    // Always default to live view when changing route.
    this.selectedRunId = 'live';
    this.viewingRun = false;
  }

  async onRunChange(runId: string | 'live'): Promise<void> {
    this.selectedRunId = runId;
    if (runId === 'live') {
      this.viewingRun = false;
      this.runEntries = [];
      this.editingRunEntry = null;
      this.runEntryDraft = null;
      this.resetRunEntryDate();
      return;
    }
    this.viewingRun = true;
    const entries = await this.storage.getRunEntries(runId);
    this.runEntries = entries
      .slice()
      .sort(
        (a, b) =>
          (a.deliveryOrder ?? 0) - (b.deliveryOrder ?? 0)
      );
    this.editingRunEntry = null;
    this.runEntryDraft = null;
    this.resetRunEntryDate();
  }

  async saveEdit(): Promise<void> {
    if (!this.editingStop) return;
    const stop = this.editingStop;
    const targetRoute = this.editDraft.routeDate || stop.routeDate;
    const requestedOrderRaw = this.editDraft.deliveryOrder || 1;
    const currentList = this.deliveries.filter(d => d.routeDate === stop.routeDate);
    const maxOrder = currentList.length || 1;
    const requestedOrder = Math.min(Math.max(1, requestedOrderRaw), maxOrder);
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
      const nextDozens = Number(this.editDraft.dozens) || 0;
      await this.storage.updatePlannedDozens(stop.id, nextDozens);
      updates.dozens = nextDozens;
    }
    if (targetRoute && targetRoute !== stop.routeDate) {
      // Moving to a different route: append at end of target list, then we will
      // adjust ordering within that route on reload if needed.
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
      // Same route: apply simple updates first.
      await this.storage.updateDeliveryFields(stop.id, updates);
      // Reflect updates in local state so subsequent sort saving doesn't
      // overwrite fields like ZIP or notes with stale values.
      Object.assign(stop, updates);
      // Then reorder within this.deliveries based on requestedOrder.
      const list = [...this.deliveries];
      const currentIdx = list.findIndex(d => d.id === stop.id);
      if (currentIdx !== -1) {
        const [removed] = list.splice(currentIdx, 1);
        const newIdx = requestedOrder - 1;
        list.splice(newIdx, 0, removed);
        // Re-index sortIndex and deliveryOrder so they stay dense.
        list.forEach((d, idx) => {
          d.sortIndex = idx;
          d.deliveryOrder = idx;
        });
        await this.storage.saveSortOrder(list);
      }
    }
    await this.loadDeliveries();
    this.editingStop = null;
  }

  async unsubscribeStop(stop: Delivery): Promise<void> {
    await this.storage.markSkipped(stop.id, 'Unsubscribed');
    await this.storage.updateDeliveryFields(stop.id, {
      subscribed: false,
    });

    // Reload so UI reflects skipped/unsubscribed state
    if (this.routeDate && this.routeDate !== this.ALL_SCHEDULES) {
      const list = await this.storage.getDeliveriesByRoute(this.routeDate);
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
      } else {
        await this.loadDeliveries();
      }
    } else {
      await this.loadDeliveries();
    }

    this.applyFilter(false);
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

  get allSchedulesTotal(): number {
    return this.routes.reduce((sum, r) => sum + (r.totalStops ?? 0), 0);
  }

  getSuggestedRate(): number {
    return this.storage.getSuggestedRate();
  }

  applyFilter(resetScroll = true): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      if (this.viewingRun) {
        this.filteredRunEntries = [...this.runEntries];
      } else {
        this.filteredDeliveries = [...this.deliveries];
      }
      return;
    }

    const matches = (name?: string, address?: string, city?: string): boolean => {
      return (
        !!name?.toLowerCase().includes(term) ||
        !!address?.toLowerCase().includes(term) ||
        !!city?.toLowerCase().includes(term)
      );
    };

    if (this.viewingRun) {
      this.filteredRunEntries = this.runEntries.filter((e) =>
        matches(e.name, e.address, e.city)
      );
    } else {
      this.filteredDeliveries = this.deliveries.filter((d) =>
        matches(d.name, d.address, d.city)
      );
    }
  }

  private normalizeDelivery(stop: Delivery): Delivery {
    const baseDozens =
      stop.originalDozens != null ? stop.originalDozens : stop.dozens ?? 0;
    if (stop.originalDozens == null) {
      stop.originalDozens = baseDozens;
    }
    if (!stop.originalDonation) {
      stop.originalDonation = {
        status: 'NotRecorded',
        suggestedAmount: baseDozens * 4,
      };
    }
    if (!stop.donation) {
      stop.donation = { status: 'NotRecorded', suggestedAmount: (stop.dozens ?? 0) * 4 };
    }
    stop.status = this.storage.computeChangeStatus(stop);
    return stop;
  }

  private computeOneOffTotals(
    stop: Delivery,
    taxYear?: number
  ): {
    donationTotal: number;
    dozensTotal: number;
    taxableTotal: number;
    baselineTotal: number;
  } {
    const now = new Date();
    const targetYear = Number.isFinite(taxYear) ? Math.trunc(taxYear as number) : undefined;
    const includeEvent = (raw?: string | number | null): boolean => {
      if (targetYear == null) return true;
      return getEventYear(raw, now) === targetYear;
    };
    const rate = this.storage.getSuggestedRate();
    const suggestedMain = (stop.dozens ?? 0) * rate;
    const includeMain = stop.status === 'delivered' && includeEvent(stop.deliveredAt);
    const mainDonation =
      includeMain && stop.donation?.status === 'Donated'
        ? Number(stop.donation.amount ?? stop.donation.suggestedAmount ?? suggestedMain)
        : 0;
    const mainTaxable =
      includeMain && stop.donation?.status === 'Donated'
        ? Number(
            stop.donation.taxableAmount ??
              Math.max(0, mainDonation - Number(stop.donation.suggestedAmount ?? suggestedMain))
          )
        : 0;
    const mainDozens =
      includeMain && stop.deliveredDozens != null
        ? Number(stop.deliveredDozens)
        : includeMain
          ? Number(stop.dozens ?? 0)
          : 0;

    const oneOffDonations = (stop.oneOffDonations ?? []).filter((donation) =>
      includeEvent(donation.date)
    );
    const oneOffDeliveries = (stop.oneOffDeliveries ?? []).filter((entry) =>
      includeEvent(entry.date)
    );

    const oneOffDonationTotal =
      oneOffDonations.reduce(
        (sum, d) => sum + Number(d.amount ?? d.suggestedAmount ?? 0),
        0
      ) +
      oneOffDeliveries.reduce(
        (sum, d) => sum + Number(d.donation?.amount ?? d.donation?.suggestedAmount ?? 0),
        0
      );

    const oneOffTaxableTotal =
      oneOffDonations.reduce((sum, d) => {
        const amount = Number(d.amount ?? d.suggestedAmount ?? 0);
        const taxable = amount > 0 ? amount : 0;
        return sum + taxable;
      }, 0) +
      oneOffDeliveries.reduce((sum, d) => {
        const suggested = Number(d.donation?.suggestedAmount ?? 0);
        const amount = Number(d.donation?.amount ?? suggested);
        const taxable =
          d.donation?.taxableAmount ?? Math.max(0, amount - suggested);
        return sum + taxable;
      }, 0);

    const oneOffDozensTotal = oneOffDeliveries.reduce(
      (sum, d) => sum + Number(d.deliveredDozens ?? 0),
      0
    );

    const baselineMain =
      includeMain && mainDozens > 0
        ? Number(stop.donation?.suggestedAmount ?? mainDozens * rate)
        : 0;
    const baselineOneOff = oneOffDeliveries.reduce((sum, d) => {
      const dozens = Number(d.deliveredDozens ?? 0);
      if (!dozens) return sum;
      const suggested = Number(
        d.donation?.suggestedAmount ?? dozens * rate
      );
      return sum + suggested;
    }, 0);
    const baselineTotal = baselineMain + baselineOneOff;

    return {
      donationTotal: mainDonation + oneOffDonationTotal,
      dozensTotal: mainDozens + oneOffDozensTotal,
      taxableTotal: mainTaxable + oneOffTaxableTotal,
      baselineTotal,
    };
  }

  /**
   * Recompute totals for the given stop using the shared
   * global totals helper. This reflects all receipts for
   * that customer (runs + one-offs + live state), so the
   * donation modal matches CSV/backup totals.
   */
  private async refreshDonationTotals(stop: Delivery): Promise<void> {
    const taxYear = this.syncSelectedTaxYear();
    try {
      const [allDeliveries, allRunEntries, importState] = await Promise.all([
        this.storage.getAllDeliveries(),
        this.storage.getAllRunEntries(),
        this.storage.getImportState('default'),
      ]);

      const totalsMap = (this.backup as any).computeTotalsByBase(
        allDeliveries,
        allRunEntries,
        importState ?? undefined,
        taxYear
      ) as Map<string, { donation: number; dozens: number; taxable: number }>;

      const totals = totalsMap.get(stop.baseRowId);
      if (totals) {
        const anyTotals = totals as any;
        const baseline =
          typeof anyTotals.baseline === 'number'
            ? anyTotals.baseline
            : Math.max(0, totals.donation - totals.taxable);
        this.donationTotals = {
          donationTotal: totals.donation,
          dozensTotal: totals.dozens,
          taxableTotal: totals.taxable,
          baselineTotal: baseline,
        };
      } else {
        this.donationTotals = {
          donationTotal: 0,
          dozensTotal: 0,
          taxableTotal: 0,
          baselineTotal: 0,
        };
      }
    } catch (err) {
      console.error('Failed to refresh donation totals', err);
      this.donationTotals = {
        donationTotal: 0,
        dozensTotal: 0,
        taxableTotal: 0,
        baselineTotal: 0,
      };
    }
  }

}
