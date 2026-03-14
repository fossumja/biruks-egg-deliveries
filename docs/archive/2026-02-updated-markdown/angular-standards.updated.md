# Angular standards (v20+)

- **Status**: Stable
- **Owner**: (set per-repo)
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: Angular app architecture and coding standards for this repo (Angular v20+)
- **Applies to**: `src/` Angular application code
- **Non-goals**: test strategy details (see `docs/dev/best-practices/testing-practices.md`)

> Repo preferences are included where they align with best practice. If a preference conflicts with best practice, this doc follows best practice and calls out the deviation.

## Rules (concise, grouped)

### Project structure and standalone components
References: [File structure](https://angular.dev/guide/file-structure), [Style guide](https://angular.dev/style-guide)

- Use **standalone components** and **standalone route configs** (no NgModules for app features).
- Prefer **feature-first** folders and **lazy-loaded feature routes** for route-level features.
- Keep components small and composable; push data fetching into `data-access/` services.

### Signals and state
References: [Signals](https://angular.dev/guide/signals), [RxJS interop](https://angular.dev/guide/rxjs-interop)

- Use signals for **local UI state** and derived values (`computed`).
- Use `effect` for **side effects** only (logging, persistence, calling an imperative API).
- Prefer **immutable updates** (replace arrays/objects) so changes are obvious and trackable.
- If integrating with RxJS, use Angular’s RxJS interop utilities rather than hand-rolled subscriptions.

### Change detection and performance
References: [Change detection](https://angular.dev/guide/change-detection), [Performance](https://angular.dev/best-practices/runtime-performance)

- Default to `ChangeDetectionStrategy.OnPush`.
- Avoid template expressions that allocate or do work each change detection pass.
- Use `@for (...; track ...)` and track by stable identifiers.
- Prefer **pure computed values** over calling functions from templates.

### Templates and control flow
References: [Control flow migration](https://angular.dev/reference/migrations/control-flow), [Template type checking](https://angular.dev/guide/template-typecheck)

- Prefer `@if`, `@for`, and `@switch` over `*ngIf/*ngFor/*ngSwitch`.
- Avoid `ngClass`/`ngStyle`; prefer `[class.foo]`, `[class]="..."`, and `[style.--var]` bindings.
- Use safe template patterns (narrow types with `@if` guards; avoid non-null assertions).

### Routing and lazy loading
References: [Router](https://angular.dev/guide/routing), [Lazy loading](https://angular.dev/guide/routing/lazy-loading), [Preloading](https://angular.dev/guide/routing/common-router-tasks#preloading)

- Route-level features must be lazy loaded (`loadChildren`).
- Prefer a small number of top-level routes; keep feature routes in `{feature}.routes.ts`.
- Use a preloading strategy intentionally (default none; add preloading only when proven valuable).

### Dependency injection
References: [Dependency injection](https://angular.dev/guide/di), [inject](https://angular.dev/api/core/inject)

- Prefer `inject()` (repo standard) and keep constructors empty.
- Don’t inject services you don’t use. Avoid “God services.”
- Prefer `providedIn: 'root'` for app-wide singletons; prefer feature-scoped providers when isolation matters.

### Host bindings and event listeners
References: [Component metadata](https://angular.dev/api/core/Component)

- Do not use `@HostBinding`/`@HostListener`.
- Use the `host` object on the decorator for:
  - Host classes/attributes
  - Host listeners

### Forms (reactive vs template-driven)
References: [Forms overview](https://angular.dev/guide/forms)

- Default to **reactive forms** for anything non-trivial (validation, conditional logic, complex UI).
- Template-driven forms are acceptable only for **very small**, mostly-static forms.
- Prefer typed `FormGroup`/`FormControl` and avoid `any`-typed form models.

### Images
References: [NgOptimizedImage](https://angular.dev/guide/image-optimization)

- Use `NgOptimizedImage` for **static images** (known at build time).
- Set `width`/`height` and a correct `priority`/`loading` strategy.
- For user-uploaded or unknown-size images, document the fallback approach and accept that some `NgOptimizedImage` benefits may not apply.

### SSR and hydration (when applicable)
References: [SSR](https://angular.dev/guide/ssr), [Hydration](https://angular.dev/guide/hydration), [Incremental hydration](https://angular.dev/guide/incremental-hydration)

- Consider SSR for SEO, initial-load performance, or deep-linking reliability.
- If using SSR, enable hydration; use incremental hydration only when needed and measured.

### State libraries (RxJS, NgRx) (when applicable)
References: [RxJS interop](https://angular.dev/guide/rxjs-interop)

- Signals are preferred for local state.
- RxJS remains appropriate for streams (events, websockets, polling, complex async composition).
- If global state becomes complex, consider a store pattern (signals-based store or a library such as NgRx). Keep the boundary explicit.

## Do / Don’t

### Components and templates

- **Do** keep templates declarative and “dumb”; move logic into signals/computed.
- **Do** use `@if/@for/@switch` and `track` in loops.
- **Don’t** call expensive functions from templates.
- **Don’t** mutate arrays/objects in place when they are used as signal values.

### DI and side effects

- **Do** use `inject()` and keep providers scoped appropriately.
- **Do** keep `effect()` free of state writes unless you are intentionally synchronizing.
- **Don’t** subscribe manually without a cleanup strategy.
- **Don’t** hide side effects in `computed()`.

## Minimal examples

### Component with signals and OnPush

```ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-deliveries-page',
  standalone: true,
  templateUrl: './deliveries-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'page',
    '(keydown.escape)': 'onEscape()',
  },
})
export class DeliveriesPageComponent {
  private readonly router = inject(Router);

  readonly query = signal('');
  readonly deliveries = signal<ReadonlyArray<{ id: string; name: string }>>([]);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q
      ? this.deliveries().filter(d => d.name.toLowerCase().includes(q))
      : this.deliveries();
  });

  private readonly persistQuery = effect(() => {
    // Side effects belong in effects.
    sessionStorage.setItem('deliveries.query', this.query());
  });

  onEscape(): void {
    this.router.navigateByUrl('/');
  }
}
```

### Template with built-in control flow

```html
<input
  type="search"
  [value]="query()"
  (input)="query.set(($event.target as HTMLInputElement).value)"
  aria-label="Search deliveries"
/>

@if (filtered().length === 0) {
  <p>No matching deliveries.</p>
} @else {
  <ul>
    @for (d of filtered(); track d.id) {
      <li>{{ d.name }}</li>
    }
  </ul>
}
```

### Routing with lazy-loaded feature routes

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page.component').then(m => m.HomePageComponent),
  },
  {
    path: 'deliveries',
    loadChildren: () =>
      import('./features/deliveries/deliveries.routes').then(m => m.DELIVERIES_ROUTES),
  },
];
```

```ts
import { Routes } from '@angular/router';

export const DELIVERIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/deliveries-page.component').then(m => m.DeliveriesPageComponent),
  },
];
```

## Common pitfalls and anti-patterns

- Writing to a signal inside a `computed()` (creates hidden side effects).
- Effects that write back to the same signals they read (feedback loops).
- Templates that call methods like `getItems()` or allocate arrays.
- Using `@for` without `track` (causes DOM churn).
- Overusing global singletons when feature-scoped providers would reduce coupling.
- Mixing reactive paradigms without a boundary (signals + RxJS + store) and losing traceability.

## Version watchlist (Angular 20+)

Update this doc when any of the following change:

- **Breaking changes** relevant to app structure or public APIs (check every major release).  
  Reference: [Releases policy](https://angular.dev/reference/releases), [Update guide](https://angular.dev/update-guide)
- SSR/hydration changes, including incremental hydration APIs.  
  Reference: [Hydration](https://angular.dev/guide/hydration), [Incremental hydration](https://angular.dev/guide/incremental-hydration)
- Zoneless status and recommended defaults (especially if it becomes stable/default).  
  Reference: [Zoneless](https://angular.dev/guide/zoneless)
- Router behavior changes (input binding, route-level rendering, preloading APIs).  
  Reference: [Routing](https://angular.dev/guide/routing)
- Testing defaults (if CLI defaults change, update the testing docs and any workflow docs).  
  Reference: [Testing](https://angular.dev/guide/testing)

## Migration-sensitive notes (Angular 19 → 20)

Angular v20 is a “polish and stabilize” release for several in-progress features. When updating from v19, review and consider:

- Reactivity: `effect`, `linkedSignal`, and `toSignal` are promoted to **stable**.  
  Reference: [Announcing Angular v20](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301)
- SSR/hydration: **incremental hydration** and **route-level rendering mode configuration** are promoted to **stable**.  
  References: [Announcing Angular v20](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301), [Incremental hydration](https://angular.dev/guide/incremental-hydration)
- Zoneless: `provideZonelessChangeDetection()` is promoted to **developer preview** and the transition guidance is updated.  
  References: [Announcing Angular v20](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301), [Zoneless](https://angular.dev/guide/zoneless)
- Template expressions: Angular v20 expands supported expression syntax (example: `in`, `**`, and untagged template literals).  
  Reference: [Announcing Angular v20](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301)

Also review the version-specific checklist in the official update guide:

- [Update guide](https://angular.dev/update-guide)
