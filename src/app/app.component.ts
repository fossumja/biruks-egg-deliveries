import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
    document.addEventListener('pointerup', this.blurHandler, { passive: true });
  }

  ngOnDestroy(): void {
    document.removeEventListener('pointerup', this.blurHandler);
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
}
