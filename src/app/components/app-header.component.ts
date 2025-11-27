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

  currentRouteSummary: { routeDate: string; delivered: number; total: number } | null = null;

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
    const done = active.filter(
      (d) => d.status === 'delivered' || d.status === 'skipped'
    ).length;
    this.currentRouteSummary = {
      routeDate: current,
      delivered: done,
      total: active.length
    };
  }

  get routeProgress(): number {
    if (!this.currentRouteSummary || !this.currentRouteSummary.total) return 0;
    const pct =
      (this.currentRouteSummary.delivered / this.currentRouteSummary.total) * 100;
    return Math.min(100, Math.max(0, pct));
  }
}
