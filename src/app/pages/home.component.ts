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
import {
  ReleaseNote,
  ReleaseNotesService
} from '../services/release-notes.service';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { getEventYear, normalizeEventDate } from '../utils/date-utils';

interface IndexedBackupRow {
  row: Record<string, string>;
  rowNumber: number;
}

interface RestoreDozensRepairIssue {
  rowNumber: number;
  baseRowId: string;
  name: string;
  schedule: string;
  originalDozens: string;
  fallbackDozens: number;
  fallbackSource: 'run-history' | 'default-zero';
}

interface RestoreDozensRepairTarget {
  row: Record<string, string>;
  issue: RestoreDozensRepairIssue;
}

interface RestoreResult {
  canceled: boolean;
  repairCount: number;
  repairReportFileName?: string;
  repairedRows: RestoreRepairReviewRow[];
}

interface RestoreRepairReviewRow {
  id: string;
  rowNumber: number;
  baseRowId: string;
  name: string;
  schedule: string;
  fallbackSource: 'run-history' | 'default-zero';
  suggestedDozens: number;
  editedDozens: number;
  deliveryIds: string[];
}

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
  private releaseNotesService = inject(ReleaseNotesService);

  routes: Route[] = [];
  lastBackupAt?: string;
  lastImportAt?: string;
  lastRestoreAt?: string;
  isImporting = false;
  isExporting = false;
  isRepairingRouteOrder = false;
  pendingRestoreAfterBackup = false;
  showRestoreHint = false;
  showHelp = false;
  readonly showReleaseInfo = signal(false);
  errorMessage = '';
  restoreRepairReviewRows: RestoreRepairReviewRow[] = [];
  isApplyingRestoreReview = false;
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
      this.errorMessage = this.readErrorMessage(
        err,
        'Export failed. Please try again.'
      );
      this.toast.show(this.errorMessage, 'error');
    } finally {
      this.isExporting = false;
    }
  }

  async repairRouteOrder(): Promise<void> {
    if (this.isImporting || this.isExporting || this.isRepairingRouteOrder) {
      return;
    }
    const approved = window.confirm(
      "Did Josh say it's okay to push this button yet? If yes, proceed."
    );
    if (!approved) {
      return;
    }

    this.isRepairingRouteOrder = true;
    this.errorMessage = '';
    try {
      const result = await this.storage.repairRouteOrderFromSnapshots();
      if (result.repaired.length) {
        const routeList = result.repaired
          .map((item) => item.routeDate)
          .join(', ');
        const updatedStops = result.repaired.reduce(
          (sum, item) => sum + item.changedCount,
          0
        );
        this.toast.show(
          `Route order repair complete for ${routeList}. Updated ${updatedStops} stops.`
        );
      } else {
        const reason =
          result.skipped[0]?.reason ?? 'No route order changes were needed.';
        this.toast.show(`Route order repair skipped: ${reason}`);
      }
      await this.refreshRoutes();
    } catch (err) {
      console.error('Route order repair failed', err);
      this.errorMessage = this.readErrorMessage(
        err,
        'Route order repair failed. Please try again.'
      );
      this.toast.show(this.errorMessage, 'error');
    } finally {
      this.isRepairingRouteOrder = false;
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
      const reason = this.readErrorMessage(err, 'Export failed.');
      this.toast.show(
        `Backup failed before restore: ${reason}`,
        'error'
      );
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
      const routeDateRaw = this.safeGet(row, [
        'Schedule',
        'schedule',
        '\ufeffSchedule',
        '\ufeffschedule',
        'Date',
        'date',
      ]);
      const routeDate = (routeDateRaw || '').trim();
      if (!routeDate) {
        const rowNumber = rawIndex + 2; // +1 for header row, +1 for zero index
        throw new Error(`Row ${rowNumber}: Missing value for "Schedule".`);
      }
      const scheduleId = routeDate.replace(/\s+/g, '') || 'Schedule';
      const plannedRaw = this.safeGet(row, ['Dozens', 'dozens', 'Qty']);
      const planned = Number(plannedRaw);
      if (Number.isNaN(planned)) {
        const rowNumber = rawIndex + 2;
        throw new Error(`Row ${rowNumber}: "Dozens" must be a number.`);
      }
      const deliveryOrderRaw = this.safeGet(row, [
        'Delivery Order',
        'delivery order',
        'Order',
        'OrderIndex',
      ]);
      const deliveryOrder = deliveryOrderRaw
        ? Number(deliveryOrderRaw) || 0
        : rawIndex;
      const baseRowId =
        (this.safeGet(row, ['BaseRowId', 'baseRowId', 'BaseRowID']) || '').trim() ||
        `ROW_${rawIndex}`;
      const subscribedRaw = (this.safeGet(row, ['Subscribed', 'subscribed', 'Sub']) || '')
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
        name: (this.safeGet(row, ['Name', 'name']) || '').trim(),
        address: (this.safeGet(row, ['Address', 'address']) || '').trim(),
        city: (this.safeGet(row, ['City', 'city']) || '').trim(),
        state: (this.safeGet(row, ['State', 'state']) || '').trim(),
        zip: (this.safeGet(row, ['ZIP', 'Zip', 'zip']) || '').trim() || undefined,
        dozens: planned,
        originalDozens: planned,
        notes: (this.safeGet(row, ['Notes', 'notes']) || '').trim() || undefined,
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
    const statusRaw = this.safeGet(row, [
      'DonationStatus',
      'donationstatus',
      'RunDonationStatus',
    ]) as DonationStatus;
    const methodRaw = this.safeGet(row, [
      'DonationMethod',
      'donationmethod',
      'RunDonationMethod',
    ]) as DonationMethod;
    const amountRaw = this.safeGet(row, [
      'DonationAmount',
      'donationamount',
      'RunDonationAmount',
    ]);
    const taxableRaw = this.safeGet(row, [
      'TaxableAmount',
      'taxableamount',
      'RunTaxableAmount',
    ]);
    const amount = amountRaw ? Number(amountRaw) : undefined;
    const taxable = taxableRaw ? Number(taxableRaw) : undefined;
    const status: DonationStatus = statusRaw || 'NoDonation';
    return {
      status,
      method: methodRaw,
      amount,
      taxableAmount: taxable,
      suggestedAmount: plannedDozens * this.storage.getSuggestedRate(),
    };
  }

  private coerceEventDate(raw?: string | number | null): string | undefined {
    const normalized = normalizeEventDate(raw);
    if (!normalized) return undefined;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? undefined : normalized;
  }

  private async restoreFromBackupFile(file: File): Promise<RestoreResult> {
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
    const indexedRows: IndexedBackupRow[] = rows.map((row, idx) => ({
      row,
      rowNumber: idx + 2, // +1 for header row, +1 for zero index
    }));

    const rowTypeHeader =
      headers.find((h) => h.toLowerCase() === 'rowtype') ?? null;

    const deliveryRowsIndexed: IndexedBackupRow[] = [];
    const runEntryRowsIndexed: IndexedBackupRow[] = [];
    const oneOffDonationRowsIndexed: IndexedBackupRow[] = [];
    const oneOffDeliveryRowsIndexed: IndexedBackupRow[] = [];

    indexedRows.forEach((indexed) => {
      const row = indexed.row;
      const rawType = rowTypeHeader
        ? row[rowTypeHeader] ?? row['RowType'] ?? row['rowtype']
        : row['RowType'] ?? row['rowtype'];
      const v = (rawType ?? '').toString().toLowerCase();
      if (!v || v === 'delivery') {
        deliveryRowsIndexed.push(indexed);
      } else if (v === 'runentry') {
        runEntryRowsIndexed.push(indexed);
      } else if (v === 'oneoffdonation') {
        oneOffDonationRowsIndexed.push(indexed);
      } else if (v === 'oneoffdelivery') {
        oneOffDeliveryRowsIndexed.push(indexed);
      }
    });

    const repairTargets = this.buildRestoreDozensRepairTargets(
      deliveryRowsIndexed,
      runEntryRowsIndexed
    );
    if (repairTargets.length > 0) {
      const warning = this.buildRestoreFallbackWarningMessage(
        repairTargets.map((target) => target.issue)
      );
      const proceed = window.confirm(warning);
      if (!proceed) {
        this.toast.show('Restore canceled. Backup file was not changed.');
        return { canceled: true, repairCount: 0, repairedRows: [] };
      }
      this.applyRestoreDozensRepairs(repairTargets);
    }

    const deliveryRows = deliveryRowsIndexed.map((item) => item.row);
    const runEntryRows = runEntryRowsIndexed.map((item) => item.row);
    const oneOffDonationRows = oneOffDonationRowsIndexed.map((item) => item.row);
    const oneOffDeliveryRows = oneOffDeliveryRowsIndexed.map((item) => item.row);

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
        const baseRowId = (this.safeGet(row, [
          'BaseRowId',
          'baseRowId',
          'RunBaseRowId',
        ]) || '').trim();
        if (!baseRowId) return;
        const targets = byBaseId.get(baseRowId);
        if (!targets || targets.length === 0) return;
        const dateRaw = this.safeGet(row, ['EventDate', 'eventdate', 'Date', 'date']);
        const normalizedDate = this.coerceEventDate(dateRaw);
        const statusRaw = this.safeGet(row, [
          'RunDonationStatus',
          'DonationStatus',
          'donationstatus',
        ]) as DonationStatus;
        const status: DonationStatus = statusRaw || 'NotRecorded';
        const methodRaw = this.safeGet(row, [
          'RunDonationMethod',
          'DonationMethod',
          'donationmethod',
        ]) as DonationMethod;
        const suggestedRaw = this.safeGet(row, ['SuggestedAmount', 'suggestedamount']);
        const amountRaw = this.safeGet(row, [
          'RunDonationAmount',
          'DonationAmount',
          'donationamount',
        ]);
        const suggested = suggestedRaw ? Number(suggestedRaw) : undefined;
        const amount = amountRaw ? Number(amountRaw) : suggested;
        const taxableRaw = this.safeGet(row, [
          'RunTaxableAmount',
          'TaxableAmount',
          'taxableamount',
        ]);
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
        const baseRowId = (this.safeGet(row, [
          'BaseRowId',
          'baseRowId',
          'RunBaseRowId',
        ]) || '').trim();
        if (!baseRowId) return;
        const targets = byBaseId.get(baseRowId);
        if (!targets || targets.length === 0) return;
        const dateRaw = this.safeGet(row, ['EventDate', 'eventdate', 'Date', 'date']);
        const normalizedDate = this.coerceEventDate(dateRaw);
        const dozensRaw = this.safeGet(row, ['RunDozens', 'Dozens', 'dozens', 'Qty']);
        const deliveredDozens = dozensRaw ? Number(dozensRaw) || 0 : 0;

        const statusRaw = this.safeGet(row, [
          'RunDonationStatus',
          'DonationStatus',
          'donationstatus',
        ]) as DonationStatus;
        const status: DonationStatus = statusRaw || 'NotRecorded';
        const methodRaw = this.safeGet(row, [
          'RunDonationMethod',
          'DonationMethod',
          'donationmethod',
        ]) as DonationMethod;
        const suggestedRaw = this.safeGet(row, ['SuggestedAmount', 'suggestedamount']);
        const amountRaw = this.safeGet(row, [
          'RunDonationAmount',
          'DonationAmount',
          'donationamount',
        ]);
        const suggested = suggestedRaw ? Number(suggestedRaw) : undefined;
        const amount = amountRaw ? Number(amountRaw) : suggested;
        const taxableRaw = this.safeGet(row, [
          'RunTaxableAmount',
          'TaxableAmount',
          'taxableamount',
        ]);
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
        const statusRaw = (this.safeGet(row, ['RunStatus', 'runstatus']) || '').toLowerCase();
        const status: DeliveryRun['status'] =
          statusRaw === 'endedearly' || statusRaw === 'ended_early'
            ? 'endedEarly'
            : statusRaw === 'completed'
            ? 'completed'
            : undefined;
        const completedRaw = this.safeGet(row, [
          'RunCompletedAt',
          'runcompletedat',
          'EventDate',
          'eventdate',
        ]);
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

      const baseRowId = (this.safeGet(row, [
        'RunBaseRowId',
        'BaseRowId',
        'baseRowId',
        'BaseRowID',
      ]) || '').trim();
      if (!baseRowId) return;

      const run = runsMap.get(runId);
      const eventDateRaw = this.safeGet(row, [
        'EventDate',
        'eventdate',
        'RunCompletedAt',
        'runcompletedat',
      ]);
      const normalizedEventDate = this.coerceEventDate(eventDateRaw);
      const eventDate = normalizedEventDate ?? run?.date;

      const deliveryOrderRaw = this.safeGet(row, [
        'RunDeliveryOrder',
        'deliveryorder',
        'RunOrder',
        'Order',
      ]);
      const deliveryOrder = Number(deliveryOrderRaw) || 0;

      const entryStatusRaw = (this.safeGet(row, ['RunEntryStatus', 'status']) || '').toLowerCase();
      const entryStatus = entryStatusRaw === 'skipped' ? 'skipped' : 'delivered';

      const dozensRaw = this.safeGet(row, ['RunDozens', 'dozens', 'Dozens', 'Qty']);
      const dozens = Number(dozensRaw) || 0;

      const donationStatusRaw = this.safeGet(row, [
        'RunDonationStatus',
        'donationstatus',
      ]) as DonationStatus;
      const donationStatus: DonationStatus = donationStatusRaw || 'NotRecorded';

      const donationMethodRaw = this.safeGet(row, [
        'RunDonationMethod',
        'donationmethod',
      ]) as DonationMethod;

      const donationAmountRaw = this.safeGet(row, [
        'RunDonationAmount',
        'donationamount',
      ]);
      const donationAmount = Number(donationAmountRaw) || 0;

      const taxableAmountRaw = this.safeGet(row, [
        'RunTaxableAmount',
        'taxableamount',
      ]);
      const taxableAmount = Number(taxableAmountRaw) || 0;

      const name = (this.safeGet(row, ['Name', 'name']) || '').trim();
      const address = (this.safeGet(row, ['Address', 'address']) || '').trim();
      const city = (this.safeGet(row, ['City', 'city']) || '').trim();
      const state = (this.safeGet(row, ['State', 'state']) || '').trim();
      const zip = (this.safeGet(row, ['ZIP', 'Zip', 'zip']) || '').trim() || undefined;

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
    const repairIssues = repairTargets.map((target) => target.issue);
    const repairedRows = this.buildRestoreRepairReviewRows(
      repairIssues,
      deliveries
    );
    const repairReportFileName =
      repairIssues.length > 0
        ? this.downloadRestoreRepairReport(file.name, repairIssues) ?? undefined
        : undefined;
    return {
      canceled: false,
      repairCount: repairIssues.length,
      repairReportFileName,
      repairedRows
    };
  }

  private buildRestoreRepairReviewRows(
    issues: RestoreDozensRepairIssue[],
    deliveries: Delivery[]
  ): RestoreRepairReviewRow[] {
    const deliveryIdsByBase = new Map<string, string[]>();
    deliveries.forEach((delivery) => {
      const baseRowId = delivery.baseRowId;
      if (!baseRowId) return;
      const list = deliveryIdsByBase.get(baseRowId) ?? [];
      list.push(delivery.id);
      deliveryIdsByBase.set(baseRowId, list);
    });

    return issues.map((issue, index) => {
      const deliveryIds = deliveryIdsByBase.get(issue.baseRowId) ?? [];
      return {
        id: `${issue.baseRowId || 'row'}-${issue.rowNumber}-${index}`,
        rowNumber: issue.rowNumber,
        baseRowId: issue.baseRowId,
        name: issue.name,
        schedule: issue.schedule,
        fallbackSource: issue.fallbackSource,
        suggestedDozens: issue.fallbackDozens,
        editedDozens: issue.fallbackDozens,
        deliveryIds
      };
    });
  }

  private buildRestoreDozensRepairTargets(
    deliveryRows: IndexedBackupRow[],
    runEntryRows: IndexedBackupRow[]
  ): RestoreDozensRepairTarget[] {
    const runHistoryDozensByBase = this.inferRunHistoryDozensByBase(runEntryRows);
    const targets: RestoreDozensRepairTarget[] = [];
    deliveryRows.forEach(({ row, rowNumber }) => {
      const rawDozens = this.safeGetRaw(row, ['Dozens', 'dozens', 'Qty']);
      const rawDozensTrimmed = rawDozens?.trim() ?? '';
      const parsedDozens = Number(rawDozensTrimmed);
      const isInvalidDozens =
        rawDozensTrimmed === '' || Number.isNaN(parsedDozens);
      if (!isInvalidDozens) {
        return;
      }
      const baseRowId = (
        this.safeGetRaw(row, ['BaseRowId', 'baseRowId', 'BaseRowID']) || ''
      ).trim();
      const fallbackDozens = runHistoryDozensByBase.get(baseRowId) ?? 0;
      const issue: RestoreDozensRepairIssue = {
        rowNumber,
        baseRowId,
        name: (this.safeGetRaw(row, ['Name', 'name']) || '').trim(),
        schedule: (this.safeGetRaw(row, ['Schedule', 'schedule', 'Date', 'date']) || '')
          .trim(),
        originalDozens: rawDozens ?? '',
        fallbackDozens,
        fallbackSource: runHistoryDozensByBase.has(baseRowId)
          ? 'run-history'
          : 'default-zero'
      };
      targets.push({ row, issue });
    });
    return targets;
  }

  private inferRunHistoryDozensByBase(
    runEntryRows: IndexedBackupRow[]
  ): Map<string, number> {
    const countsByBase = new Map<string, Map<number, number>>();
    runEntryRows.forEach(({ row }) => {
      const baseRowId = (
        this.safeGetRaw(row, ['RunBaseRowId', 'BaseRowId', 'baseRowId', 'BaseRowID']) ||
        ''
      ).trim();
      if (!baseRowId) {
        return;
      }
      const status = (
        this.safeGetRaw(row, ['RunEntryStatus', 'status']) || ''
      ).trim().toLowerCase();
      if (status !== 'delivered') {
        return;
      }
      const dozensRaw = this.safeGetRaw(row, ['RunDozens', 'Dozens', 'dozens', 'Qty']);
      const dozens = Number(dozensRaw);
      if (!Number.isFinite(dozens)) {
        return;
      }
      const normalizedDozens = Math.max(0, Math.trunc(dozens));
      const baseCounts = countsByBase.get(baseRowId) ?? new Map<number, number>();
      baseCounts.set(normalizedDozens, (baseCounts.get(normalizedDozens) ?? 0) + 1);
      countsByBase.set(baseRowId, baseCounts);
    });

    const inferred = new Map<string, number>();
    countsByBase.forEach((counts, baseRowId) => {
      let bestDozens: number | null = null;
      let bestCount = -1;
      counts.forEach((count, dozens) => {
        if (
          count > bestCount ||
          (count === bestCount && (bestDozens == null || dozens > bestDozens))
        ) {
          bestCount = count;
          bestDozens = dozens;
        }
      });
      if (bestDozens != null) {
        inferred.set(baseRowId, bestDozens);
      }
    });

    return inferred;
  }

  private applyRestoreDozensRepairs(
    targets: RestoreDozensRepairTarget[]
  ): void {
    targets.forEach(({ row, issue }) => {
      this.setRowValue(row, ['Dozens', 'dozens', 'Qty'], issue.fallbackDozens.toString());
    });
  }

  private buildRestoreFallbackWarningMessage(
    issues: RestoreDozensRepairIssue[]
  ): string {
    const preview = issues
      .slice(0, 5)
      .map((issue) => {
        const baseHint = issue.baseRowId ? `${issue.baseRowId} · ` : '';
        const name = issue.name || 'Unnamed';
        const schedule = issue.schedule || 'Unknown schedule';
        const original = issue.originalDozens.trim() ? issue.originalDozens : '(blank)';
        const source =
          issue.fallbackSource === 'run-history' ? 'run history' : 'default 0';
        return `Row ${issue.rowNumber}: ${baseHint}${name} (${schedule}) "${original}" -> ${issue.fallbackDozens} (${source})`;
      })
      .join('\n');
    const moreCount = issues.length - 5;
    const more = moreCount > 0 ? `\n...and ${moreCount} more row(s).` : '';
    const plural = issues.length === 1 ? '' : 's';
    return (
      `Restore found ${issues.length} row${plural} with invalid "Dozens" values.\n\n` +
      'If you continue, restore will repair these values using run history when possible, otherwise 0.\n' +
      'A restore-repair JSON report will be downloaded after restore.\n\n' +
      `${preview}${more}\n\n` +
      'Continue with fallback repairs?'
    );
  }

  private downloadRestoreRepairReport(
    sourceFilename: string,
    issues: RestoreDozensRepairIssue[]
  ): string | null {
    if (
      typeof document === 'undefined' ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      return null;
    }
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sourceBase = this.sanitizeFilenamePart(
        sourceFilename.replace(/\.[^.]+$/, '')
      );
      const filename = `${sourceBase}-restore-repair-${stamp}.json`;
      const report = {
        reportVersion: 1,
        createdAt: new Date().toISOString(),
        sourceFilename,
        issueCount: issues.length,
        issues
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return filename;
    } catch (error) {
      console.warn('Restore repair report export failed.', error);
      return null;
    }
  }

  private sanitizeFilenamePart(value: string): string {
    const cleaned = value.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '');
    return cleaned || 'backup';
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
    this.restoreRepairReviewRows = [];
    try {
      const restoreResult = await this.restoreFromBackupFile(file);
      if (restoreResult?.canceled) {
        return;
      }
      await this.refreshRoutes();
      localStorage.removeItem('currentRoute');
      this.currentRoute = undefined;
      this.autoselectRoute();
      await this.refreshTaxYearOptions();
      const repairCount = restoreResult?.repairCount ?? 0;
      this.restoreRepairReviewRows = restoreResult?.repairedRows ?? [];
      if (repairCount > 0) {
        const plural = repairCount === 1 ? '' : 's';
        const reportHint = restoreResult?.repairReportFileName
          ? ` Repair report: ${restoreResult.repairReportFileName}`
          : '';
        this.toast.show(
          `Restore complete with ${repairCount} fallback repair${plural}.${reportHint}`
        );
      } else {
        this.toast.show('Restore complete');
      }
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

  updateRestoreRepairDozens(
    row: RestoreRepairReviewRow,
    value: number | string
  ): void {
    row.editedDozens = this.normalizeNonNegativeWholeNumber(
      value,
      row.suggestedDozens
    );
  }

  dismissRestoreRepairReview(): void {
    this.restoreRepairReviewRows = [];
  }

  async applyRestoreRepairReview(): Promise<void> {
    if (!this.restoreRepairReviewRows.length || this.isApplyingRestoreReview) {
      return;
    }
    this.isApplyingRestoreReview = true;
    this.errorMessage = '';
    try {
      const deliveries = await this.storage.getAllDeliveries();
      const deliveryById = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
      let updatedStops = 0;
      for (const reviewRow of this.restoreRepairReviewRows) {
        const normalizedDozens = this.normalizeNonNegativeWholeNumber(
          reviewRow.editedDozens,
          reviewRow.suggestedDozens
        );
        reviewRow.editedDozens = normalizedDozens;
        for (const deliveryId of reviewRow.deliveryIds) {
          const existing = deliveryById.get(deliveryId);
          if (!existing) continue;
          await this.storage.updateDeliveryFields(deliveryId, {
            dozens: normalizedDozens,
            originalDozens: normalizedDozens,
            status: existing.status
          });
          updatedStops += 1;
        }
      }

      this.restoreRepairReviewRows = [];
      await this.refreshRoutes();
      if (updatedStops > 0) {
        this.toast.show(
          `Applied repaired-row updates to ${updatedStops} stop${updatedStops === 1 ? '' : 's'}.`
        );
      } else {
        this.toast.show('No repaired-row updates were applied.');
      }
    } catch (err) {
      console.error('Failed to apply repaired-row updates', err);
      const reason = this.readErrorMessage(
        err,
        'Failed to apply repaired-row updates.'
      );
      this.errorMessage = reason;
      this.toast.show(reason, 'error');
    } finally {
      this.isApplyingRestoreReview = false;
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

  private safeGet(row: Record<string, string>, keys: string[]): string | undefined {
    const clean = (s: string) => s.replace(/^\ufeff/, '').toLowerCase();
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== '') return row[key];
      // Case-insensitive/BOM fallback
      const target = clean(key);
      const found = Object.keys(row).find((k) => clean(k) === target);
      if (
        found !== undefined &&
        row[found] !== undefined &&
        row[found] !== ''
      ) {
        return row[found];
      }
    }
    return undefined;
  }

  private safeGetRaw(row: Record<string, string>, keys: string[]): string | undefined {
    const clean = (s: string) => s.replace(/^\ufeff/, '').toLowerCase();
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
      const target = clean(key);
      const found = Object.keys(row).find((k) => clean(k) === target);
      if (found !== undefined && row[found] !== undefined) {
        return row[found];
      }
    }
    return undefined;
  }

  private setRowValue(
    row: Record<string, string>,
    keys: string[],
    value: string
  ): void {
    const clean = (s: string) => s.replace(/^\ufeff/, '').toLowerCase();
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        row[key] = value;
        return;
      }
      const target = clean(key);
      const found = Object.keys(row).find((k) => clean(k) === target);
      if (found !== undefined) {
        row[found] = value;
        return;
      }
    }
    row[keys[0]] = value;
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }
    return fallback;
  }

  private normalizeNonNegativeWholeNumber(
    value: number | string,
    fallback = 0
  ): number {
    const parsed =
      typeof value === 'number' ? value : Number((value ?? '').toString());
    if (!Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(fallback));
    }
    return Math.max(0, Math.trunc(parsed));
  }
}
