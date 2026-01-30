import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subscription } from 'rxjs';
import { AppHeaderComponent } from './components/app-header.component';
import { ToastComponent } from './components/toast.component';

function getCurrentRouteLink(base: string[]): string[] {
  const current = localStorage.getItem('currentRoute');
  return current ? [...base, current] : base;
}

const HOVER_PREF_KEY = 'noHoverEffects';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  private swUpdate = inject(SwUpdate, { optional: true });
  private updateSub?: Subscription;
  private blurHandler = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const clickable = target.closest('button, a');
    if (clickable instanceof HTMLElement) {
      clickable.blur?.();
    }
  };

  get plannerLink(): string[] {
    return getCurrentRouteLink(['/plan']);
  }

  get runLink(): string[] {
    return getCurrentRouteLink(['/run']);
  }

  readonly updateAvailable = signal(false);
  readonly updateInProgress = signal(false);

  ngOnInit(): void {
    const stored = localStorage.getItem('darkModeEnabled');
    const dark = stored === null ? true : stored === 'true';
    if (stored === null) {
      localStorage.setItem('darkModeEnabled', 'true');
    }
    this.applyTheme(dark);

    const hoverStored = localStorage.getItem(HOVER_PREF_KEY);
    const prefersNoHover =
      hoverStored === null
        ? typeof window !== 'undefined' && window.matchMedia?.('(hover: none)')?.matches
        : hoverStored === 'true';
    if (hoverStored === null) {
      localStorage.setItem(HOVER_PREF_KEY, prefersNoHover ? 'true' : 'false');
    }
    this.applyHoverPref(prefersNoHover);

    this.lockOrientation();
    this.setupUpdatePrompt();
    document.addEventListener('pointerup', this.blurHandler, { passive: true });
  }

  ngOnDestroy(): void {
    document.removeEventListener('pointerup', this.blurHandler);
    this.updateSub?.unsubscribe();
  }

  dismissUpdatePrompt(): void {
    this.updateAvailable.set(false);
  }

  async reloadForUpdate(): Promise<void> {
    if (this.updateInProgress()) return;
    this.updateInProgress.set(true);
    if (this.swUpdate?.isEnabled) {
      try {
        await this.swUpdate.activateUpdate();
      } catch (err) {
        console.warn('Service worker update activation failed', err);
      }
    }
    this.performReload();
  }

  private applyTheme(enabled: boolean): void {
    const root = document.documentElement;
    if (enabled) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  private applyHoverPref(disableHover: boolean): void {
    const root = document.documentElement;
    if (disableHover) {
      root.classList.add('no-hover-effects');
    } else {
      root.classList.remove('no-hover-effects');
    }
  }

  private lockOrientation(): void {
    try {
      // Best effort; not all browsers/devices support this.
      if ('orientation' in screen && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('portrait').catch(() => null);
      }
    } catch {
      // Ignore if not supported.
    }
  }

  private performReload(): void {
    window.location.reload();
  }

  private setupUpdatePrompt(): void {
    if (!this.swUpdate?.isEnabled) return;
    this.updateSub = this.swUpdate.versionUpdates.subscribe((event: VersionEvent) => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable.set(true);
      }
    });
  }
}
