import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

function getCurrentRouteLink(base: string[]): string[] {
  const current = localStorage.getItem('currentRoute');
  return current ? [...base, current] : base;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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
