import { DatePipe, NgIf } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Papa from 'papaparse';
import {
  Delivery,
  DeliveryStatus,
  DonationInfo,
  DonationMethod,
  DonationStatus,
} from '../models/delivery.model';
import { DeliveryRun } from '../models/delivery-run.model';
import { RunSnapshotEntry } from '../models/run-snapshot-entry.model';
import { Route } from '../models/route.model';
import { BackupService } from '../services/backup.service';
import { BuildInfo, BuildInfoService } from '../services/build-info.service';
import {
  ReleaseNote,
  ReleaseNotesService
} from '../services/release-notes.service';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { getEventYear, normalizeEventDate } from '../utils/date-utils';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, FormsModule, DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnDestroy {
  private wakeLock: any | null = null;
  private visibilityHandler?: () => void;
  private storage = inject(StorageService);
  private router = inject(Router);
  private backupService = inject(BackupService);
  private toast = inject(ToastService);
  private buildInfoService = inject(BuildInfoService);
  private releaseNotesService = inject(ReleaseNotesService);

  routes: Route[] = [];
  lastBackupAt?: string;
  lastImportAt?: string;
  lastRestoreAt?: string;
  isImporting = false;
  isExporting = false;
  pendingRestoreAfterBackup = false;
  showRestoreHint = false;
  showHelp = false;
  readonly showReleaseInfo = signal(false);
  errorMessage = '';
  selectedRouteDate: string | null = null;
  selectedRouteSummary?: Route;
  currentRoute?: string;
  wakeLockSupported =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  wakeLockActive = false;
  // Keep screen awake is hidden until iOS wake lock support is reliable.
  readonly showWakeLockOption = signal(false);
  private wakeLockKey = 'keepScreenAwake';
  suggestedRate = 4;
  private suggestedKey = 'suggestedDonationRate';
  darkModeEnabled = false;
  buildInfo?: BuildInfo | null;
  readonly releaseNotes = signal<ReleaseNote[]>([]);
  readonly releaseNotesError = signal('');
  private readonly releaseNotesLimit = 5;
  readonly visibleReleaseNotes = computed(() =>
    this.releaseNotes().slice(0, this.releaseNotesLimit)
  );
  plannerReorderDefaultEnabled = false;
  taxYearOptions: number[] = [];
  selectedTaxYear = new Date().getFullYear();
  hasMultiYearData = false;

  async ngOnInit(): Promise<void> {
    await this.refreshRoutes();
    await this.refreshTaxYearOptions();
    this.lastBackupAt = localStorage.getItem('lastBackupAt') || undefined;
    this.lastImportAt = localStorage.getItem('lastImportAt') || undefined;
    this.lastRestoreAt = localStorage.getItem('lastRestoreAt') || undefined;
    this.currentRoute = localStorage.getItem('currentRoute') || undefined;
    this.suggestedRate = this.storage.getSuggestedRate();
    const storedDark = localStorage.getItem('darkModeEnabled');
    this.darkModeEnabled = storedDark === null ? true : storedDark === 'true';
    if (storedDark === null) {
      localStorage.setItem('darkModeEnabled', 'true');
    }
    this.wakeLockActive = localStorage.getItem(this.wakeLockKey) === 'true';
    const storedReorder = localStorage.getItem('plannerReorderEnabled');
    this.plannerReorderDefaultEnabled = storedReorder === 'true';
    this.applyTheme(this.darkModeEnabled);
    this.autoselectRoute();
    await this.resumeIfNeeded();
    this.buildInfo = await this.buildInfoService.load();
    await this.loadReleaseNotes();

    if (this.wakeLockSupported) {
      this.visibilityHandler = () => {
        if (
          document.visibilityState === 'visible' &&
          this.wakeLockActive &&
          !this.wakeLock
        ) {
          void this.requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    // If this is a brand new install with no routes yet, auto-load bundled sample data
    // and seed some history so the app feels "alive" on first run.
    if (!this.routes.length) {
      await this.importSampleDataIfAvailable();
    }
  }

  ngOnDestroy(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting = true;
    this.errorMessage = '';
    try {
      const deliveries = await this.parseCsv(file);
      await this.storage.importDeliveries(deliveries);
      localStorage.setItem('lastImportSource', 'user');
      // After a new import, any previous backup no longer matches this dataset.
      localStorage.removeItem('lastBackupAt');
      this.lastBackupAt = undefined;
      const now = new Date().toISOString();
      localStorage.setItem('lastImportAt', now);
      this.lastImportAt = now;
      await this.refreshRoutes();
      this.autoselectRoute();
      await this.refreshTaxYearOptions();
      this.toast.show('Import complete');
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : 'Please check CSV format and try again.';
      this.errorMessage = `Import failed: ${message}`;
      this.toast.show(this.errorMessage, 'error');
    } finally {
      this.isImporting = false;
      input.value = '';
    }
  }

  async onImportClick(fileInput: HTMLInputElement): Promise<void> {
    // Ensure we have the latest route list.
    if (!this.routes.length) {
      await this.refreshRoutes();
    }
    fileInput.click();
  }

  async exportCsv(): Promise<void> {
    this.isExporting = true;
    this.errorMessage = '';
    try {
      await this.backupService.exportAll(this.selectedTaxYear);
      this.lastBackupAt = localStorage.getItem('lastBackupAt') || undefined;
      // Manual backup: no special hint.
      this.showRestoreHint = false;
      this.toast.show('Backup ready');
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Export failed. Please try again.';
      this.toast.show('Backup failed', 'error');
    } finally {
      this.isExporting = false;
    }
  }

  onTaxYearChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    const parsed = Number(target.value);
    if (!Number.isFinite(parsed)) return;
    const nextYear = Math.trunc(parsed);
    this.selectedTaxYear = nextYear;
    this.persistSelectedTaxYear(nextYear);
  }

  goTo(route: string): void {
    this.router.navigate([route]);
  }

  async toggleWakeLock(): Promise<void> {
    if (!this.wakeLockSupported) {
      this.wakeLockActive = false;
      localStorage.setItem(this.wakeLockKey, 'false');
      this.toast.show(
        'Screen wake lock is not supported on this device/browser.',
        'error'
      );
      return;
    }
    if (this.wakeLockActive) {
      this.releaseWakeLock();
      this.wakeLockActive = false;
      localStorage.setItem(this.wakeLockKey, 'false');
      this.toast.show('Screen will sleep normally');
    } else {
      const granted = await this.requestWakeLock();
      this.wakeLockActive = granted;
      localStorage.setItem(this.wakeLockKey, granted ? 'true' : 'false');
      if (!granted) {
        this.toast.show('Unable to keep screen awake', 'error');
      } else {
        this.toast.show('Screen will stay awake');
      }
    }
  }

  private async requestWakeLock(): Promise<boolean> {
    try {
      // @ts-ignore
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener?.('release', () => {
        this.wakeLock = null;
        this.wakeLockActive = false;
      });
      this.wakeLockActive = true;
      return true;
    } catch (err) {
      console.warn('Wake lock failed', err);
      this.wakeLock = null;
      this.wakeLockActive = false;
      this.wakeLockSupported = false;
      localStorage.setItem(this.wakeLockKey, 'false');
      this.toast.show(
        'Screen wake lock is not supported on this device/browser.',
        'error'
      );
      return false;
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLock?.release) {
      this.wakeLock.release().catch(() => null);
    }
    this.wakeLock = null;
  }

  async startRoute(): Promise<void> {
    if (!this.selectedRouteDate) return;
    localStorage.setItem('currentRoute', this.selectedRouteDate);
    localStorage.setItem('lastSelectedRoute', this.selectedRouteDate);
    this.currentRoute = this.selectedRouteDate;
    await this.router.navigate(['/plan', this.selectedRouteDate]);
  }

  onSelectRoute(routeDate: string | null): void {
    if (!routeDate) {
      this.selectedRouteDate = null;
      this.selectedRouteSummary = undefined;
      return;
    }
    this.selectedRouteDate = routeDate;
    this.selectedRouteSummary = this.routes.find(
      (r) => r.routeDate === routeDate
    );
    localStorage.setItem('lastSelectedRoute', routeDate);
  }

  private async refreshRoutes(): Promise<void> {
    this.routes = await this.storage.getRoutes();
    if (this.selectedRouteDate) {
      this.selectedRouteSummary = this.routes.find(
        (r) => r.routeDate === this.selectedRouteDate
      );
    }
  }

  private async refreshTaxYearOptions(): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const dataYears = new Set<number>();
    const baselineYear = this.resolveBaselineYear(currentYear);
    dataYears.add(baselineYear);

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

    const availableYears = new Set<number>(dataYears);
    availableYears.add(currentYear);

    const sortedYears = Array.from(availableYears).sort((a, b) => a - b);
    this.taxYearOptions = sortedYears;
    this.hasMultiYearData = dataYears.size > 1;

    const storedYear = this.readStoredTaxYear();
    const nextYear =
      (storedYear != null && availableYears.has(storedYear)
        ? storedYear
        : availableYears.has(currentYear)
        ? currentYear
        : sortedYears[sortedYears.length - 1]) ?? currentYear;

    this.selectedTaxYear = nextYear;
    this.persistSelectedTaxYear(nextYear);
  }

  private readStoredTaxYear(): number | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem('selectedTaxYear');
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
  }

  private persistSelectedTaxYear(year: number): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('selectedTaxYear', year.toString());
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

  private async maybeBackupBeforeRestore(): Promise<boolean> {
    const confirmMessage =
      'You already have delivery data loaded. Restoring from a backup will replace all current deliveries, routes, and run history.\n\n' +
      'It is strongly recommended to export a backup first so you keep a copy of your past runs and donations.\n\n' +
      'Press OK to export a backup now and then continue with Restore (CSV), or Cancel to abort.';

    const proceed = window.confirm(confirmMessage);
    if (!proceed) {
      return false;
    }

    try {
      this.isExporting = true;
      await this.backupService.exportAll(this.selectedTaxYear);
      this.lastBackupAt = localStorage.getItem('lastBackupAt') || undefined;
      this.toast.show('Backup ready');
      return true;
    } catch (err) {
      console.error('Backup before import failed', err);
      this.toast.show('Backup failed. Restore cancelled.', 'error');
      return false;
    } finally {
      this.isExporting = false;
    }
  }

  private async importSampleDataIfAvailable(): Promise<void> {
    try {
      const response = await fetch('sample-deliveries.csv', {
        cache: 'no-cache',
      });
      if (!response.ok) {
        return;
      }
      const text = await response.text();
      const deliveries = await this.parseCsvText(text);
      await this.storage.importDeliveries(deliveries);
      localStorage.setItem('lastImportSource', 'sample');
      await this.refreshRoutes();
      this.autoselectRoute();
      await this.refreshTaxYearOptions();
      this.toast.show('Loaded sample deliveries');
    } catch (err) {
      console.warn('Sample CSV could not be loaded', err);
    }
  }

  private async parseCsv(file: File): Promise<Delivery[]> {
    const text = await file.text();
    return this.parseCsvText(text);
  }

  private parseCsvText(text: string): Promise<Delivery[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<Record<string, string>>) => {
          try {
            const headers = results.meta.fields ?? [];
            const hasRowType = headers.some(
              (h) => h.toLowerCase() === 'rowtype'
            );
            const filteredRows = hasRowType
              ? results.data.filter((row) => {
                  const value =
                    row['RowType'] ?? row['rowtype'] ?? row['ROWTYPE'];
                  // Treat missing or "Delivery" as a delivery row; ignore RunEntry rows.
                  return (
                    !value || value.toString().toLowerCase() === 'delivery'
                  );
                })
              : results.data;
            const deliveries = this.normalizeRows(filteredRows, headers);
            const rowsByBase = this.buildImportState(headers, results.data);
            void this.storage.saveImportState({
              id: 'default',
              headers,
              rowsByBaseRowId: rowsByBase,
              mode: 'baseline',
            });
            resolve(deliveries);
          } catch (e) {
            reject(e);
          }
        },
        error: (error: Error) => reject(error),
      });
    });
  }

  private normalizeRows(
    rows: Record<string, string>[],
    headers: string[]
  ): Delivery[] {
    const now = new Date().toISOString();
    const grouped = new Map<string, Delivery[]>();
    const statusBlank: DeliveryStatus = '';

    const scheduleHeader =
      headers.find((h) =>
        ['schedule', '\ufeffschedule', 'date'].includes(h.toLowerCase())
      ) ?? null;
    if (!scheduleHeader) {
      throw new Error('Missing required column "Schedule" (or "Date").');
    }
    const deliveryOrderHeader =
      headers.find((h) => h.toLowerCase() === 'delivery order') ?? null;

    rows.forEach((row, rawIndex) => {
      const routeDateRaw =
        (scheduleHeader ? row[scheduleHeader] : undefined) ||
        row['Schedule'] ||
        row['schedule'] ||
        row['Date'] ||
        row['date'] ||
        row['\ufeffSchedule'] ||
        row['\ufeffschedule'] ||
        '';
      const routeDate = (routeDateRaw || '').trim();
      if (!routeDate) {
        const rowNumber = rawIndex + 2; // +1 for header row, +1 for zero index
        throw new Error(`Row ${rowNumber}: Missing value for "Schedule".`);
      }
      const scheduleId = routeDate.replace(/\s+/g, '') || 'Schedule';
      const plannedRaw = row['Dozens'] || row['dozens'] || row['Qty'] || '0';
      const planned = Number(plannedRaw);
      if (Number.isNaN(planned)) {
        const rowNumber = rawIndex + 2;
        throw new Error(`Row ${rowNumber}: "Dozens" must be a number.`);
      }
      const deliveryOrderRaw =
        (deliveryOrderHeader ? row[deliveryOrderHeader] : undefined) ||
        row['Delivery Order'] ||
        row['delivery order'] ||
        row['Order'];
      const deliveryOrder = deliveryOrderRaw
        ? Number(deliveryOrderRaw) || 0
        : rawIndex;
      const baseRowId =
        (
          row['BaseRowId'] ||
          row['baseRowId'] ||
          row['BaseRowID'] ||
          ''
        ).trim() || `ROW_${rawIndex}`;
      const subscribedRaw = (row['Subscribed'] || row['subscribed'] || '')
        .toString()
        .trim()
        .toLowerCase();
      const subscribed =
        subscribedRaw === ''
          ? true
          : subscribedRaw === 'true' ||
            subscribedRaw === 'yes' ||
            subscribedRaw === '1';
      const runId = routeDate;
      const donation = this.buildDonationFromRow(row, planned);
      const delivery: Delivery = {
        id: crypto.randomUUID(),
        runId,
        baseRowId,
        week: scheduleId,
        routeDate,
        name: (row['Name'] || row['name'] || '').trim(),
        address: (row['Address'] || row['address'] || '').trim(),
        city: (row['City'] || row['city'] || '').trim(),
        state: (row['State'] || row['state'] || '').trim(),
        zip: (row['ZIP'] || row['Zip'] || row['zip'] || '').trim() || undefined,
        dozens: planned,
        originalDozens: planned,
        notes: (row['Notes'] || row['notes'] || '').trim() || undefined,
        sortIndex: 0,
        deliveryOrder,
        status: statusBlank,
        donation,
        subscribed,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };
      const arr = grouped.get(routeDate) ?? [];
      arr.push(delivery);
      grouped.set(routeDate, arr);
    });

    const deliveries: Delivery[] = [];
    grouped.forEach((list) => {
      list.forEach((d, i) => {
        d.sortIndex = i;
        d.deliveryOrder = i;
        if (!d.donation) {
          d.donation = {
            status: 'NoDonation',
            amount: 0,
            suggestedAmount: d.dozens * this.storage.getSuggestedRate(),
          };
        }
      });
      deliveries.push(...list);
    });

    return deliveries;
  }

  private buildImportState(
    headers: string[],
    rows: Record<string, string>[]
  ): Record<string, string[]> {
    const rowsByBase: Record<string, string[]> = {};
    rows.forEach((row, idx) => {
      const baseRowId =
        (
          row['BaseRowId'] ||
          row['baseRowId'] ||
          row['BaseRowID'] ||
          ''
        ).trim() || `ROW_${idx}`;
      const values = headers.map((h) => row[h] ?? '');
      rowsByBase[baseRowId] = values;
    });
    return rowsByBase;
  }

  private buildDonationFromRow(
    row: Record<string, string>,
    plannedDozens: number
  ): DonationInfo {
    const statusRaw = (row['DonationStatus'] || row['donationstatus']) as
      | DonationStatus
      | undefined;
    const methodRaw = (row['DonationMethod'] || row['donationmethod']) as
      | DonationMethod
      | undefined;
    const amountRaw = row['DonationAmount'] || row['donationamount'];
    const amount = amountRaw ? Number(amountRaw) : undefined;
    const status: DonationStatus = statusRaw ?? 'NoDonation';
    return {
      status,
      method: methodRaw,
      amount,
      suggestedAmount: plannedDozens * this.storage.getSuggestedRate(),
    };
  }

  private coerceEventDate(raw?: string | number | null): string | undefined {
    const normalized = normalizeEventDate(raw);
    if (!normalized) return undefined;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? undefined : normalized;
  }

  private async restoreFromBackupFile(file: File): Promise<void> {
    const text = await file.text();
    const parsed = await new Promise<Papa.ParseResult<Record<string, string>>>(
      (resolve, reject) => {
        Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject,
        });
      }
    );

    const headers = parsed.meta.fields ?? [];
    const rows = parsed.data;

    const rowTypeHeader =
      headers.find((h) => h.toLowerCase() === 'rowtype') ?? null;

    const deliveryRows: Record<string, string>[] = [];
    const runEntryRows: Record<string, string>[] = [];
    const oneOffDonationRows: Record<string, string>[] = [];
    const oneOffDeliveryRows: Record<string, string>[] = [];

    rows.forEach((row) => {
      const rawType = rowTypeHeader
        ? row[rowTypeHeader] ?? row['RowType'] ?? row['rowtype']
        : row['RowType'] ?? row['rowtype'];
      const v = (rawType ?? '').toString().toLowerCase();
      if (!v || v === 'delivery') {
        deliveryRows.push(row);
      } else if (v === 'runentry') {
        runEntryRows.push(row);
      } else if (v === 'oneoffdonation') {
        oneOffDonationRows.push(row);
      } else if (v === 'oneoffdelivery') {
        oneOffDeliveryRows.push(row);
      }
    });

    const deliveries = this.normalizeRows(deliveryRows, headers);

    // Rebuild one-off donations and deliveries from backup rows so they can
    // participate in totals and history just like freshly-recorded events.
    if (oneOffDonationRows.length || oneOffDeliveryRows.length) {
      const byBaseId = new Map<string, Delivery[]>();
      deliveries.forEach((d) => {
        const key = d.baseRowId;
        const arr = byBaseId.get(key) ?? [];
        arr.push(d);
        byBaseId.set(key, arr);
      });

      // Attach one-off donations.
      oneOffDonationRows.forEach((row) => {
        const baseRowId = (
          row['BaseRowId'] ||
          row['baseRowId'] ||
          row['BaseRowID'] ||
          row['RunBaseRowId'] ||
          ''
        ).trim();
        if (!baseRowId) return;
        const targets = byBaseId.get(baseRowId);
        if (!targets || !targets.length) return;
        const dateRaw = (row['EventDate'] ||
          row['eventdate'] ||
          row['Date'] ||
          row['date'] ||
          '') as string;
        const normalizedDate = this.coerceEventDate(dateRaw);
        const statusRaw = (row['RunDonationStatus'] ||
          row['DonationStatus'] ||
          row['donationstatus'] ||
          '') as DonationStatus;
        const status: DonationStatus = statusRaw || 'NotRecorded';
        const methodRaw = (row['RunDonationMethod'] ||
          row['DonationMethod'] ||
          row['donationmethod'] ||
          '') as DonationMethod;
        const suggestedRaw =
          row['SuggestedAmount'] || row['suggestedamount'] || '';
        const amountRaw =
          row['RunDonationAmount'] ||
          row['DonationAmount'] ||
          row['donationamount'] ||
          '';
        const suggested = suggestedRaw ? Number(suggestedRaw) : undefined;
        const amount = amountRaw ? Number(amountRaw) : suggested;
        const taxableRaw =
          row['RunTaxableAmount'] ||
          row['TaxableAmount'] ||
          row['taxableamount'] ||
          '';
        const taxable = taxableRaw ? Number(taxableRaw) : undefined;

        const donationBase = {
          status,
          method: methodRaw || undefined,
          suggestedAmount: suggested,
          amount,
          taxableAmount: taxable,
        };

        targets.forEach((d) => {
          const fallbackDate = this.coerceEventDate(d.routeDate);
          const eventDate = normalizedDate ?? fallbackDate ?? '';
          const donation: DonationInfo = {
            ...donationBase,
            date: eventDate,
          };
          d.oneOffDonations = [...(d.oneOffDonations ?? []), donation];
        });
      });

      // Attach one-off deliveries.
      oneOffDeliveryRows.forEach((row) => {
        const baseRowId = (
          row['BaseRowId'] ||
          row['baseRowId'] ||
          row['BaseRowID'] ||
          row['RunBaseRowId'] ||
          ''
        ).trim();
        if (!baseRowId) return;
        const targets = byBaseId.get(baseRowId);
        if (!targets || !targets.length) return;
        const dateRaw = (row['EventDate'] ||
          row['eventdate'] ||
          row['Date'] ||
          row['date'] ||
          '') as string;
        const normalizedDate = this.coerceEventDate(dateRaw);
        const dozensRaw =
          row['RunDozens'] ||
          row['Dozens'] ||
          row['dozens'] ||
          row['Qty'] ||
          '';
        const deliveredDozens = dozensRaw ? Number(dozensRaw) || 0 : 0;

        const statusRaw = (row['RunDonationStatus'] ||
          row['DonationStatus'] ||
          row['donationstatus'] ||
          '') as DonationStatus;
        const status: DonationStatus = statusRaw || 'NotRecorded';
        const methodRaw = (row['RunDonationMethod'] ||
          row['DonationMethod'] ||
          row['donationmethod'] ||
          '') as DonationMethod;
        const suggestedRaw =
          row['SuggestedAmount'] || row['suggestedamount'] || '';
        const amountRaw =
          row['RunDonationAmount'] ||
          row['DonationAmount'] ||
          row['donationamount'] ||
          '';
        const suggested = suggestedRaw ? Number(suggestedRaw) : undefined;
        const amount = amountRaw ? Number(amountRaw) : suggested;
        const taxableRaw =
          row['RunTaxableAmount'] ||
          row['TaxableAmount'] ||
          row['taxableamount'] ||
          '';
        const taxable = taxableRaw ? Number(taxableRaw) : undefined;

        const donationBase: DonationInfo | undefined =
          status === 'NotRecorded' && !methodRaw && amount == null
            ? undefined
            : {
                status,
                method: methodRaw || undefined,
                suggestedAmount: suggested,
                amount,
                taxableAmount: taxable,
              };

        targets.forEach((d) => {
          const fallbackDate = this.coerceEventDate(d.routeDate);
          const eventDate = normalizedDate ?? fallbackDate ?? '';
          const donation = donationBase
            ? {
                ...donationBase,
                date: eventDate,
              }
            : undefined;
          const list = [...(d.oneOffDeliveries ?? [])];
          list.push({
            deliveredDozens,
            donation,
            date: eventDate,
          });
          d.oneOffDeliveries = list;
        });
      });
    }
    const rowsByBase = this.buildImportState(headers, deliveryRows);
    const importState = {
      id: 'default',
      headers,
      rowsByBaseRowId: rowsByBase,
      mode: 'restored' as const,
    };

    const runsMap = new Map<string, DeliveryRun>();
    const runEntries: RunSnapshotEntry[] = [];

    runEntryRows.forEach((row) => {
      const runId = (row['RunId'] || row['runid'] || '').trim();
      if (!runId) return;

      if (!runsMap.has(runId)) {
        const routeDate = (row['RouteDate'] || row['routedate'] || '').trim();
        const scheduleId =
          (row['ScheduleId'] || row['scheduleid'] || '').toString().trim() ||
          routeDate.replace(/\s+/g, '') ||
          'Schedule';
        const runStatusRaw = (row['RunStatus'] || row['runstatus'] || '')
          .toString()
          .trim()
          .toLowerCase();
        const status =
          runStatusRaw === 'endedearly' || runStatusRaw === 'ended_early'
            ? 'endedEarly'
            : runStatusRaw === 'completed'
            ? 'completed'
            : undefined;
        const completedRaw = (row['RunCompletedAt'] ||
          row['runcompletedat'] ||
          row['EventDate'] ||
          row['eventdate'] ||
          '') as string;
        const normalizedCompleted = this.coerceEventDate(completedRaw);
        const normalizedRoute = this.coerceEventDate(routeDate);
        const runDateIso =
          normalizedCompleted ?? normalizedRoute ?? new Date().toISOString();

        const newRun: DeliveryRun = {
          id: runId,
          date: runDateIso,
          weekType: scheduleId,
          label: routeDate ? `${routeDate} – restored` : 'Restored run',
          status,
          routeDate: routeDate || undefined,
        };
        runsMap.set(runId, newRun);
      }

      const baseRowId = (
        row['RunBaseRowId'] ||
        row['BaseRowId'] ||
        row['baseRowId'] ||
        row['BaseRowID'] ||
        ''
      ).trim();
      if (!baseRowId) return;

      const run = runsMap.get(runId);
      const eventDateRaw = (row['EventDate'] ||
        row['eventdate'] ||
        row['RunCompletedAt'] ||
        row['runcompletedat'] ||
        '') as string;
      const normalizedEventDate = this.coerceEventDate(eventDateRaw);
      const eventDate = normalizedEventDate ?? run?.date;

      const deliveryOrderRaw =
        row['RunDeliveryOrder'] ||
        row['deliveryorder'] ||
        row['RunOrder'] ||
        '';
      const deliveryOrder = Number(deliveryOrderRaw) || 0;

      const entryStatusRaw = (row['RunEntryStatus'] || row['status'] || '')
        .toString()
        .toLowerCase();
      const entryStatus =
        entryStatusRaw === 'skipped' ? 'skipped' : 'delivered';

      const dozens =
        Number(row['RunDozens'] || row['dozens'] || row['Dozens'] || 0) || 0;

      const donationStatusRaw = (row['RunDonationStatus'] ||
        row['donationstatus'] ||
        'NotRecorded') as DonationStatus;
      const donationStatus: DonationStatus = donationStatusRaw || 'NotRecorded';

      const donationMethodRaw = (row['RunDonationMethod'] ||
        row['donationmethod'] ||
        '') as DonationMethod;

      const donationAmount =
        Number(row['RunDonationAmount'] || row['donationamount'] || 0) || 0;

      const taxableAmount =
        Number(row['RunTaxableAmount'] || row['taxableamount'] || 0) || 0;

      const name = (row['Name'] || row['name'] || '').trim();
      const address = (row['Address'] || row['address'] || '').trim();
      const city = (row['City'] || row['city'] || '').trim();
      const state = (row['State'] || row['state'] || '').trim();
      const zip =
        (row['ZIP'] || row['Zip'] || row['zip'] || '').trim() || undefined;

      runEntries.push({
        id: crypto.randomUUID(),
        runId,
        baseRowId,
        name,
        address,
        city,
        state,
        zip,
        status: entryStatus,
        dozens,
        deliveryOrder,
        donationStatus,
        donationMethod:
          donationStatus === 'Donated' && donationMethodRaw
            ? donationMethodRaw
            : undefined,
        donationAmount: donationStatus === 'Donated' ? donationAmount : 0,
        taxableAmount,
        eventDate: eventDate ?? undefined,
      });
    });

    const runs = Array.from(runsMap.values());

    await this.storage.restoreAllFromBackup(
      deliveries,
      importState,
      runs,
      runEntries
    );
    const now = new Date().toISOString();
    localStorage.setItem('lastRestoreAt', now);
    this.lastRestoreAt = now;
    // After restore, previous import/backup timestamps no longer describe current data.
    localStorage.removeItem('lastBackupAt');
    localStorage.removeItem('lastImportAt');
    this.lastBackupAt = undefined;
    this.lastImportAt = undefined;
  }

  changeSuggested(delta: number): void {
    const next = Math.max(0, Math.min(100, Number(this.suggestedRate) + delta));
    this.suggestedRate = next;
    this.storage.setSuggestedRate(next);
    this.toast.show(`Suggested donation set to $${next}`);
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
    if (this.showHelp) {
      this.showReleaseInfo.set(false);
    }
  }

  toggleReleaseInfo(): void {
    const next = !this.showReleaseInfo();
    this.showReleaseInfo.set(next);
    if (next) {
      this.showHelp = false;
    }
  }

  private async loadReleaseNotes(): Promise<void> {
    const notes = await this.releaseNotesService.load();
    if (!notes?.length) {
      this.releaseNotes.set([]);
      this.releaseNotesError.set('Release notes are unavailable right now.');
      return;
    }
    const ordered = this.orderReleaseNotes(notes);
    this.releaseNotes.set(ordered);
    this.releaseNotesError.set('');
  }

  private orderReleaseNotes(notes: ReleaseNote[]): ReleaseNote[] {
    return notes
      .slice()
      .sort(
        (a, b) => {
          const dateDiff =
            this.parseReleaseDate(b.date) - this.parseReleaseDate(a.date);
          if (dateDiff !== 0) return dateDiff;
          return this.compareReleaseVersions(b.version, a.version);
        }
      );
  }

  private parseReleaseDate(value?: string): number {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private compareReleaseVersions(a: string, b: string): number {
    const aParts = this.parseReleaseVersion(a);
    const bParts = this.parseReleaseVersion(b);
    for (let index = 0; index < Math.max(aParts.length, bParts.length); index += 1) {
      const aValue = aParts[index] ?? 0;
      const bValue = bParts[index] ?? 0;
      if (aValue !== bValue) return aValue - bValue;
    }
    return 0;
  }

  private parseReleaseVersion(value: string): number[] {
    const raw = value?.startsWith('v') ? value.slice(1) : value;
    return raw
      .split('.')
      .map((part) => Number(part))
      .map((part) => (Number.isFinite(part) ? Math.trunc(part) : 0));
  }

  onRestoreClick(input: HTMLInputElement): void {
    if (this.isImporting || this.isExporting) {
      return;
    }
    // If a backup was just completed for this restore, allow immediate file selection.
    if (this.pendingRestoreAfterBackup) {
      this.pendingRestoreAfterBackup = false;
      this.showRestoreHint = false;
      input.click();
      return;
    }

    void this.handleRestoreWithBackup(input);
  }

  private async handleRestoreWithBackup(
    input: HTMLInputElement
  ): Promise<void> {
    const ok = await this.maybeBackupBeforeRestore();
    if (!ok) {
      return;
    }
    this.pendingRestoreAfterBackup = true;
    this.showRestoreHint = true;
    this.toast.show(
      'Backup ready. Tap "Restore (CSV)" again to choose a file.'
    );
  }

  async onRestoreSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const confirmMessage =
      'Restoring from backup will replace all current deliveries, routes, run history, and import data in this app with the contents of this file.\n\n' +
      'This cannot be undone. Are you sure you want to continue?';
    const proceed = window.confirm(confirmMessage);
    if (!proceed) {
      input.value = '';
      return;
    }

    this.isImporting = true;
    this.errorMessage = '';
    try {
      await this.restoreFromBackupFile(file);
      await this.refreshRoutes();
      localStorage.removeItem('currentRoute');
      this.currentRoute = undefined;
      this.autoselectRoute();
      await this.refreshTaxYearOptions();
      this.toast.show('Restore complete');
    } catch (err: unknown) {
      console.error('Restore failed', err);
      const reason =
        err instanceof Error && err.message
          ? err.message
          : typeof err === 'string'
          ? err
          : '';
      if (reason) {
        this.errorMessage = `Restore failed: ${reason}`;
      } else {
        this.errorMessage =
          'Restore failed. The backup file could not be processed.';
      }
      this.toast.show(this.errorMessage, 'error');
    } finally {
      this.isImporting = false;
      input.value = '';
    }
  }

  toggleDarkMode(): void {
    this.darkModeEnabled = !this.darkModeEnabled;
    localStorage.setItem(
      'darkModeEnabled',
      this.darkModeEnabled ? 'true' : 'false'
    );
    this.applyTheme(this.darkModeEnabled);
    this.toast.show(this.darkModeEnabled ? 'Dark mode on' : 'Dark mode off');
  }

  private applyTheme(enabled: boolean): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  private autoselectRoute(): void {
    const lastSelected = localStorage.getItem('lastSelectedRoute');
    const preferred =
      (this.currentRoute &&
        this.routes.find((r) => r.routeDate === this.currentRoute)
          ?.routeDate) ||
      (lastSelected &&
        this.routes.find((r) => r.routeDate === lastSelected)?.routeDate) ||
      (this.routes.length === 1 ? this.routes[0]?.routeDate : null);
    if (preferred) {
      this.onSelectRoute(preferred);
    }
  }

  private async resumeIfNeeded(): Promise<void> {
    const currentRoute = localStorage.getItem('currentRoute');
    if (!currentRoute) return;
    const deliveries = await this.storage.getDeliveriesByRoute(currentRoute);
    const hasPending = deliveries.some(
      (d) => d.status === '' || d.status === 'changed'
    );
    if (!hasPending) {
      localStorage.removeItem('currentRoute');
      this.currentRoute = undefined;
    } else {
      this.currentRoute = currentRoute;
    }
  }
}
