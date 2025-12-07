import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  @Input() plannerLink: string[] = ['/plan'];
  @Input() runLink: string[] = ['/run'];

  currentRouteSummary:
    | {
        routeDate: string;
        delivered: number;
        skipped: number;
        total: number;
        dozensDelivered: number;
        dozensTotal: number;
      }
    | null = null;

  private routerSub?: Subscription;
  private refreshTimer?: number;

  constructor(private storage: StorageService, private router: Router) {}

  ngOnInit(): void {
    void this.refreshSummary();
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => void this.refreshSummary());
    this.refreshTimer = window.setInterval(() => void this.refreshSummary(), 1500);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
    }
  }

  private async refreshSummary(): Promise<void> {
    const currentRunId = localStorage.getItem('currentRunId');
    if (currentRunId === '__ALL_RECEIPTS__') {
      const summary = await this.storage.getAllReceiptsSummary();
      if (!summary) {
        this.currentRouteSummary = null;
        return;
      }
      this.currentRouteSummary = {
        routeDate: 'All receipts',
        delivered: summary.delivered,
        skipped: summary.skipped,
        total: summary.total,
        dozensDelivered: summary.dozensDelivered,
        dozensTotal: summary.dozensTotal
      };
      return;
    }

    if (currentRunId) {
      const entries = await this.storage.getRunEntries(currentRunId);
      if (!entries.length) {
        this.currentRouteSummary = null;
        return;
      }
      const deliveredEntries = entries.filter((e) => e.status === 'delivered');
      const skippedEntries = entries.filter((e) => e.status === 'skipped');
      const total = entries.length;
      const dozensTotal = entries.reduce((sum, e) => sum + (e.dozens ?? 0), 0);
      const dozensDelivered = deliveredEntries.reduce(
        (sum, e) => sum + (e.dozens ?? 0),
        0
      );
      // Try to get route label from run; fall back to first entry's routeDate via deliveries if needed.
      const run = await this.storage.getRun(currentRunId);
      const routeDate =
        run?.routeDate ??
        run?.weekType ??
        localStorage.getItem('currentRoute') ??
        'Run';
      this.currentRouteSummary = {
        routeDate,
        delivered: deliveredEntries.length,
        skipped: skippedEntries.length,
        total,
        dozensDelivered,
        dozensTotal
      };
      return;
    }

    const current =
      localStorage.getItem('currentRoute') || localStorage.getItem('lastSelectedRoute');
    if (!current) {
      this.currentRouteSummary = null;
      return;
    }
    const deliveries = await this.storage.getDeliveriesByRoute(current);
    const active = deliveries.filter(
      (d) =>
        !(
          d.status === 'skipped' &&
          (d.skippedReason?.toLowerCase?.().includes('unsubscribed') ?? false)
        )
    );
    const skipped = active.filter((d) => d.status === 'skipped').length;
    const delivered = active.filter((d) => d.status === 'delivered').length;
    const effectiveTotal = Math.max(0, active.length - skipped);
    const dozensTotal = active.reduce(
      (sum, d) => sum + (d.dozens ?? 0),
      0
    );
    const dozensDelivered = active
      .filter((d) => d.status === 'delivered')
      .reduce(
        (sum, d) => sum + (d.deliveredDozens ?? d.dozens ?? 0),
        0
      );
    this.currentRouteSummary = {
      routeDate: current,
      delivered,
      skipped,
      total: effectiveTotal,
      dozensDelivered,
      dozensTotal
    };
  }

  get routeProgress(): number {
    if (!this.currentRouteSummary || !this.currentRouteSummary.total) return 0;
    const pct =
      (this.currentRouteSummary.delivered / this.currentRouteSummary.total) * 100;
    return Math.min(100, Math.max(0, pct));
  }

}
