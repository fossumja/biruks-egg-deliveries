import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from './components/app-header.component';
import { ToastComponent } from './components/toast.component';

function getCurrentRouteLink(base: string[]): string[] {
  const current = localStorage.getItem('currentRoute');
  return current ? [...base, current] : base;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  get plannerLink(): string[] {
    return getCurrentRouteLink(['/plan']);
  }

  get runLink(): string[] {
    return getCurrentRouteLink(['/run']);
  }
}
