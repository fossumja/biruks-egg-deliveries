import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import Papa from 'papaparse';
import { Delivery, DeliveryStatus, DonationInfo, DonationMethod, DonationStatus } from '../models/delivery.model';
import { Route } from '../models/route.model';
import { BackupService } from '../services/backup.service';
import { StorageService } from '../services/storage.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private storage = inject(StorageService);
  private router = inject(Router);
  private backupService = inject(BackupService);
  private toast = inject(ToastService);

  routes: Route[] = [];
  lastBackupAt?: string;
  isImporting = false;
  isExporting = false;
  errorMessage = '';
  selectedRouteDate: string | null = null;
  selectedRouteSummary?: Route;
  currentRoute?: string;

  async ngOnInit(): Promise<void> {
    await this.refreshRoutes();
    this.lastBackupAt = localStorage.getItem('lastBackupAt') || undefined;
    this.currentRoute = localStorage.getItem('currentRoute') || undefined;
    this.autoselectRoute();
    await this.resumeIfNeeded();
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
      await this.refreshRoutes();
      this.autoselectRoute();
      this.toast.show('Import complete');
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Import failed. Please check CSV format and try again.';
      this.toast.show('Import failed', 'error');
    } finally {
      this.isImporting = false;
      input.value = '';
    }
  }

  async exportCsv(): Promise<void> {
    this.isExporting = true;
    this.errorMessage = '';
    try {
      await this.backupService.exportAll();
      this.lastBackupAt = localStorage.getItem('lastBackupAt') || undefined;
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

  private async parseCsv(file: File): Promise<Delivery[]> {
    const text = await file.text();
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

    rows.forEach((row, rawIndex) => {
      const routeDate = (row['Date'] || row['date'] || '').trim();
      if (!routeDate) {
        throw new Error('Missing Date column');
      }
      const planned = Number(row['Dozens'] || row['dozens'] || row['Qty'] || 0) || 0;
      const deliveryOrderRaw = row['Delivery Order'] || row['delivery order'] || row['Order'];
      const deliveryOrder = deliveryOrderRaw ? Number(deliveryOrderRaw) || 0 : rawIndex;
      const baseRowId = (row['BaseRowId'] || row['baseRowId'] || row['BaseRowID'] || '').trim() || `ROW_${rawIndex}`;
      const week = (row['Week'] || row['week'] || '').trim() || 'WeekA';
      const runId = `${routeDate}_${week}`;
      const donation = this.buildDonationFromRow(row, planned);
      const delivery: Delivery = {
        id: crypto.randomUUID(),
        runId,
        baseRowId,
        week,
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
          d.donation = { status: 'NotRecorded', suggestedAmount: d.dozens * 4 };
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
      suggestedAmount: plannedDozens * 4
    };
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
