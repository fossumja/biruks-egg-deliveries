import { DatePipe, NgIf, NgClass, NgFor } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Papa from 'papaparse';
import { Delivery, DeliveryStatus, DonationInfo, DonationMethod, DonationStatus } from '../models/delivery.model';
import { Route } from '../models/route.model';
import { BackupService } from '../services/backup.service';
import { BuildInfo, BuildInfoService } from '../services/build-info.service';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, NgClass, FormsModule, DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnDestroy {
  private wakeLock: any | null = null;
  private visibilityHandler?: () => void;
  private storage = inject(StorageService);
  private router = inject(Router);
  private backupService = inject(BackupService);
  private toast = inject(ToastService);
  private buildInfoService = inject(BuildInfoService);

  routes: Route[] = [];
  lastBackupAt?: string;
  lastImportAt?: string;
  isImporting = false;
  isExporting = false;
  pendingImportAfterBackup = false;
  showImportHint = false;
  errorMessage = '';
  selectedRouteDate: string | null = null;
  selectedRouteSummary?: Route;
  currentRoute?: string;
  wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  wakeLockActive = false;
  private wakeLockKey = 'keepScreenAwake';
  suggestedRate = 4;
  private suggestedKey = 'suggestedDonationRate';
  darkModeEnabled = false;
  buildInfo?: BuildInfo | null;
  plannerReorderDefaultEnabled = false;

  async ngOnInit(): Promise<void> {
    await this.refreshRoutes();
    this.lastBackupAt = localStorage.getItem('lastBackupAt') || undefined;
    this.lastImportAt = localStorage.getItem('lastImportAt') || undefined;
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

    if (this.wakeLockSupported) {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible' && this.wakeLockActive && !this.wakeLock) {
          void this.requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    // If this is a brand new install with no routes yet, auto-load bundled sample data.
    if (!this.routes.length) {
      await this.importSampleDataIfAvailable();
    }
  }

  ngOnDestroy(): void {
    this.releaseWakeLock();
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
      this.pendingImportAfterBackup = false;
      this.showImportHint = false;
      await this.refreshRoutes();
      this.autoselectRoute();
      this.toast.show('Import complete');
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Please check CSV format and try again.';
      this.errorMessage = `Import failed: ${message}`;
      this.toast.show(this.errorMessage, 'error');
    } finally {
      this.isImporting = false;
      input.value = '';
    }
  }

  async onImportClick(fileInput: HTMLInputElement): Promise<void> {
    // If a backup was just completed for this import, allow immediate file selection.
    if (this.pendingImportAfterBackup) {
      this.pendingImportAfterBackup = false;
      this.showImportHint = false;
      fileInput.click();
      return;
    }

    // Ensure we have the latest route list.
    if (!this.routes.length) {
      await this.refreshRoutes();
    }
    const hasRoutes = this.routes.length > 0;
    const lastSource = localStorage.getItem('lastImportSource');

    // No real data yet, or only sample data: open the picker immediately.
    if (!hasRoutes || lastSource === 'sample') {
      fileInput.click();
      return;
    }

    // Real data exists: run backup flow first. Due to browser security,
    // we can't open the file picker after an async operation and still
    // have it count as a user gesture, so we require a second tap.
    const ok = await this.maybeBackupBeforeImport();
    if (!ok) {
      return;
    }
    this.pendingImportAfterBackup = true;
    this.showImportHint = true;
    this.toast.show('Backup ready. Tap "Import CSV" again to choose a file.');
  }

  async exportCsv(): Promise<void> {
    this.isExporting = true;
    this.errorMessage = '';
    try {
      await this.backupService.exportAll();
      this.lastBackupAt = localStorage.getItem('lastBackupAt') || undefined;
      // Manual backup: no special import hint.
      this.showImportHint = false;
      this.toast.show('Backup ready');
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Export failed. Please try again.';
      this.toast.show('Backup failed', 'error');
    } finally {
      this.isExporting = false;
    }
  }

  goTo(route: string): void {
    this.router.navigate([route]);
  }

  async toggleWakeLock(): Promise<void> {
    if (!this.wakeLockSupported) {
      this.toast.show('Screen wake lock not supported', 'error');
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
    this.selectedRouteSummary = this.routes.find((r) => r.routeDate === routeDate);
    localStorage.setItem('lastSelectedRoute', routeDate);
  }

  private async refreshRoutes(): Promise<void> {
    this.routes = await this.storage.getRoutes();
    if (this.selectedRouteDate) {
      this.selectedRouteSummary = this.routes.find((r) => r.routeDate === this.selectedRouteDate);
    }
  }

  private async maybeBackupBeforeImport(): Promise<boolean> {
    const confirmMessage =
      'You already have delivery data loaded. Importing a new CSV will replace the current data in the app.\n\n' +
      'It is strongly recommended to export a backup first so you keep a copy of your past runs and donations.\n\n' +
      'Press OK to export a backup now and then continue with the import, or Cancel to abort.';

    const proceed = window.confirm(confirmMessage);
    if (!proceed) {
      return false;
    }

    try {
      this.isExporting = true;
      await this.backupService.exportAll();
      this.lastBackupAt = localStorage.getItem('lastBackupAt') || undefined;
      this.toast.show('Backup ready');
      return true;
    } catch (err) {
      console.error('Backup before import failed', err);
      this.toast.show('Backup failed. Import cancelled.', 'error');
      return false;
    } finally {
      this.isExporting = false;
    }
  }

  private async importSampleDataIfAvailable(): Promise<void> {
    try {
      const response = await fetch('sample-deliveries.csv', { cache: 'no-cache' });
      if (!response.ok) {
        return;
      }
      const text = await response.text();
      const deliveries = await this.parseCsvText(text);
      await this.storage.importDeliveries(deliveries);
      localStorage.setItem('lastImportSource', 'sample');
      await this.refreshRoutes();
      this.autoselectRoute();
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
            const deliveries = this.normalizeRows(results.data, results.meta.fields ?? []);
            const headers = results.meta.fields ?? [];
            const rowsByBase = this.buildImportState(headers, results.data);
            void this.storage.saveImportState({ id: 'default', headers, rowsByBaseRowId: rowsByBase });
            resolve(deliveries);
          } catch (e) {
            reject(e);
          }
        },
        error: (error: Error) => reject(error)
      });
    });
  }

  private normalizeRows(rows: Record<string, string>[], headers: string[]): Delivery[] {
    const now = new Date().toISOString();
    const grouped = new Map<string, Delivery[]>();
    const statusBlank: DeliveryStatus = '';

    const scheduleHeader =
      headers.find((h) => ['schedule', '\ufeffschedule', 'date'].includes(h.toLowerCase())) ?? null;
    if (!scheduleHeader) {
      throw new Error('Missing required column "Schedule" (or "Date").');
    }
    const deliveryOrderHeader = headers.find((h) => h.toLowerCase() === 'delivery order') ?? null;

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
      const deliveryOrder = deliveryOrderRaw ? Number(deliveryOrderRaw) || 0 : rawIndex;
      const baseRowId = (row['BaseRowId'] || row['baseRowId'] || row['BaseRowID'] || '').trim() || `ROW_${rawIndex}`;
      const subscribedRaw = (row['Subscribed'] || row['subscribed'] || '').toString().trim().toLowerCase();
      const subscribed =
        subscribedRaw === ''
          ? true
          : subscribedRaw === 'true' || subscribedRaw === 'yes' || subscribedRaw === '1';
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
        synced: false
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
          d.donation = { status: 'NotRecorded', suggestedAmount: d.dozens * this.storage.getSuggestedRate() };
        }
      });
      deliveries.push(...list);
    });

    return deliveries;
  }

  private buildImportState(headers: string[], rows: Record<string, string>[]): Record<string, string[]> {
    const rowsByBase: Record<string, string[]> = {};
    rows.forEach((row, idx) => {
      const baseRowId = (row['BaseRowId'] || row['baseRowId'] || row['BaseRowID'] || '').trim() || `ROW_${idx}`;
      const values = headers.map((h) => row[h] ?? '');
      rowsByBase[baseRowId] = values;
    });
    return rowsByBase;
  }

  private buildDonationFromRow(row: Record<string, string>, plannedDozens: number): DonationInfo {
    const statusRaw = (row['DonationStatus'] || row['donationstatus']) as DonationStatus | undefined;
    const methodRaw = (row['DonationMethod'] || row['donationmethod']) as DonationMethod | undefined;
    const amountRaw = row['DonationAmount'] || row['donationamount'];
    const amount = amountRaw ? Number(amountRaw) : undefined;
    const status: DonationStatus = statusRaw ?? 'NotRecorded';
    return {
      status,
      method: methodRaw,
      amount,
      suggestedAmount: plannedDozens * this.storage.getSuggestedRate()
    };
  }

  changeSuggested(delta: number): void {
    const next = Math.max(0, Math.min(100, Number(this.suggestedRate) + delta));
    this.suggestedRate = next;
    this.storage.setSuggestedRate(next);
    this.toast.show(`Suggested donation set to $${next}`);
  }

  togglePlannerReorderDefault(): void {
    this.plannerReorderDefaultEnabled = !this.plannerReorderDefaultEnabled;
    localStorage.setItem(
      'plannerReorderEnabled',
      this.plannerReorderDefaultEnabled ? 'true' : 'false'
    );
  }

  toggleDarkMode(): void {
    this.darkModeEnabled = !this.darkModeEnabled;
    localStorage.setItem('darkModeEnabled', this.darkModeEnabled ? 'true' : 'false');
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
      (this.currentRoute && this.routes.find((r) => r.routeDate === this.currentRoute)?.routeDate) ||
      (lastSelected && this.routes.find((r) => r.routeDate === lastSelected)?.routeDate) ||
      (this.routes.length === 1 ? this.routes[0]?.routeDate : null);
    if (preferred) {
      this.onSelectRoute(preferred);
    }
  }

  private async resumeIfNeeded(): Promise<void> {
    const currentRoute = localStorage.getItem('currentRoute');
    if (!currentRoute) return;
    const deliveries = await this.storage.getDeliveriesByRoute(currentRoute);
    const hasPending = deliveries.some((d) => d.status === '' || d.status === 'changed');
    if (!hasPending) {
      localStorage.removeItem('currentRoute');
      this.currentRoute = undefined;
    } else {
      this.currentRoute = currentRoute;
    }
  }
}
