# Angular standards (v20+)

- **Path:** `docs/dev/best-practices/angular-standards.md`
- **Last updated:** 2025-12-19
- **Applies to:** `src/app/**` and shared libs used by the Angular app
- **Audience:** developers, reviewers, and AI coding agents

## Purpose

This document defines **Angular-specific** standards for this repo. It assumes our general repo conventions already exist (TypeScript style, testing standards, documentation style guide, etc.) and avoids duplicating them.

When a project preference conflicts with Angular best practices, **follow Angular best practice** and note the exception in the PR/ADR.

## Non-goals

- Testing guidelines (covered in `docs/dev/best-practices/testing-*.md`)
- General TypeScript conventions (covered in `docs/dev/best-practices/typescript-standards.md`)
- General accessibility standards (covered in `docs/dev/best-practices/accessibility-standards.md`)

## Repo defaults (already adopted)

- Standalone components only
- Signals for state
- No `@HostBinding`/`@HostListener`; use the `host` object in decorators
- Use `input()` and `output()` functions instead of `@Input()`/`@Output()`
- `ChangeDetectionStrategy.OnPush` by default
- Prefer `@if`/`@for`/`@switch` over `*ngIf`/`*ngFor`/`*ngSwitch`
- No `ngClass`/`ngStyle`; use class/style bindings
- Prefer `inject()` (field init) over constructor injection
- Use `NgOptimizedImage` for static images

## 1) Rules (grouped by topic)

### Standalone patterns and file structure ([Components](https://angular.dev/guide/components))

- **MUST** keep components **standalone** and import what they use via `imports: []` in `@Component`.
- **MUST** keep components small and single-purpose; compose features from components rather than “mega components”.
- **SHOULD** prefer **feature folders** with clear public entry points.
  - Recommended per-feature layout:
    - `feature.routes.ts` (lazy route entry)
    - `feature.page.ts` (route-level page component)
    - `components/` (presentational components)
    - `data-access/` (services, stores, API clients)
    - `ui/` (dumb UI building blocks, reusable within the feature)
- **MUST** keep route-level components “thin”: orchestration, data loading, and wiring only.
- **SHOULD** keep templates and styles external (`templateUrl`/`styleUrl`) except for truly tiny components. ([Components essentials](https://angular.dev/guide/components))

### Signals and state ([Signals](https://angular.dev/guide/signals))

- **MUST** use signals for local and feature state.
- **MUST** treat state as immutable from consumers:
  - Prefer `.set()`/`.update()` on a private writable signal, and expose a read-only signal (or a computed).
- **MUST** prefer `computed()` for derived state.
- **SHOULD** use `effect()` sparingly:
  - Side effects only (I/O, logging, bridging to non-signal APIs), not for “deriving state”. ([effect](https://angular.dev/api/core/effect))
- **SHOULD** prefer `linkedSignal()`/`model()` when you need a signal that tracks an input + local edits. ([linkedSignal](https://angular.dev/api/core/linkedSignal))

**Avoid mutation patterns**
- **DON’T** mutate arrays/objects in-place inside state; create new references instead.
- **DON’T** put HTTP calls directly in effects unless you understand cancellation and teardown. Prefer RxJS for cancellable streams.

### RxJS interop and async data ([RxJS interop](https://angular.dev/api/core/rxjs-interop))

- **MUST** use RxJS where it is the best tool:
  - Cancellation, concurrency, retries, buffering, backpressure, and stream composition.
- **SHOULD** convert Observables to signals at the UI boundary with `toSignal()` where it improves ergonomics. ([toSignal](https://angular.dev/api/core/rxjs-interop/toSignal))
- **MUST** avoid manual subscription management in components:
  - Prefer `AsyncPipe` in templates, or `takeUntilDestroyed()` in code. ([takeUntilDestroyed](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed))
- **SHOULD** keep “business streams” in services/data-access, not in presentational components.

**NgRx**
- Allowed when the app needs global, event-driven, multi-feature state with strong tooling (devtools, time-travel, effects).  
- If using NgRx, keep components dumb: selectors in the store layer, minimal glue at the route level.

> Note: This suite only links to official Angular docs. NgRx docs are intentionally not linked here.

### Change detection and performance ([Advanced component configuration](https://angular.dev/guide/components/advanced-configuration))

- **MUST** use `ChangeDetectionStrategy.OnPush` for all components unless there is a documented exception.
- **SHOULD** model UI state with signals + `computed()` so change detection work stays localized.
- **MUST** use `@for (...; track ...)` with a stable tracking key to prevent DOM churn. ([Control flow](https://angular.dev/guide/templates/control-flow))
- **SHOULD** use `@defer` for heavy or below-the-fold UI chunks to reduce initial JS. ([Deferred loading](https://angular.dev/guide/templates/defer))
- **SHOULD** enable compiler checks that help catch slow or unsafe patterns (template type checking, extended diagnostics).  
  - Template type checking: ([Template type checking](https://angular.dev/tools/cli/template-typecheck))  
  - Extended diagnostics: ([Extended diagnostics](https://angular.dev/extended-diagnostics))

### Routing and lazy loading ([Routing overview](https://angular.dev/guide/routing))

- **MUST** lazy load feature areas using `loadChildren` (routes file) or `loadComponent` (single page).
- **SHOULD** keep routing configuration in `*.routes.ts` files and export `Routes`.
- **SHOULD** prefer functional guards/resolvers for smaller surface area and tree-shakeability (where applicable).
- **SHOULD** use a preloading strategy when it improves UX:
  - Built-in and custom preloading are supported; keep preloading logic centralized. ([Preloading strategies](https://angular.dev/guide/routing/route-preloading-strategies))

### Templates and control flow ([Templates](https://angular.dev/guide/templates))

- **MUST** prefer built-in control flow blocks: `@if`, `@for`, `@switch`. ([Control flow](https://angular.dev/guide/templates/control-flow))
- **MUST** avoid `ngClass`/`ngStyle`; use class/style bindings for clarity. ([Angular style guide](https://angular.dev/style-guide))
- **SHOULD** use `@let` / local variables to avoid repeated expensive expressions and to clarify intent. ([Template variables](https://angular.dev/guide/templates/variables))
- **MUST** keep templates “safe”:
  - No side-effectful work in template expressions
  - Prefer pure derived values (`computed`) and bind to those
- **MUST** avoid conditionally including `<ng-content>` (it still instantiates content). ([Content projection note](https://angular.dev/guide/components/content-projection))

### Dependency injection with `inject()` ([inject](https://angular.dev/api/core/inject))

- **MUST** inject services with `inject()` in field initializers where possible for consistency.
- **SHOULD** keep providers at the narrowest reasonable scope:
  - `providedIn: 'root'` for true singletons (default for most services). ([Creating and using services](https://angular.dev/guide/di/creating-and-using-services))
- **SHOULD** keep DI boundaries clean: components depend on services; services depend on other services (not on components).

> Angular still supports constructor injection, but this repo standardizes on `inject()` for consistency. If you need constructor injection (e.g., inheritance constraints), document the exception.

### Host bindings and event listeners via `host` ([Host elements](https://angular.dev/guide/components/host-elements))

- **MUST** define host bindings/listeners via the decorator `host` object.
- **MUST** keep host bindings simple and readable; if host logic grows, consider a directive/host directive.
- **DON’T** use `@HostBinding`/`@HostListener` except when migrating legacy code.  
  - Angular explicitly recommends preferring `host` over `@HostListener`. ([HostListener](https://angular.dev/api/core/HostListener))

### Forms guidance ([Forms overview](https://angular.dev/guide/forms))

- **MUST** default to **Reactive Forms** for non-trivial forms (validation, dynamic controls, multi-step flows). ([Forms overview](https://angular.dev/guide/forms))
- **MAY** use **Template-driven forms** for very small/simple forms where logic is mostly in the template. ([Template-driven forms](https://angular.dev/guide/forms/template-driven-forms))
- **SHOULD** keep form state in the form model, not duplicated across signals and forms unless there is a clear reason.
- **SHOULD** isolate complex form logic in a “form service” or feature store rather than bloating the component.

### Image handling ([Image optimization](https://angular.dev/guide/image-optimization))

- **MUST** use `NgOptimizedImage` for static images (app assets, known URLs). ([NgOptimizedImage](https://angular.dev/api/common/NgOptimizedImage))
- **MUST** specify required sizing info (`width`/`height` or `fill`, plus `sizes` when responsive) to prevent layout shift.
- **SHOULD** use `priority` for LCP images (hero images) and avoid it elsewhere.
- **DON’T** use `NgOptimizedImage` for cases it does not support (e.g., highly dynamic URLs without known dimensions); fall back to `<img>` with careful sizing and `loading` attributes.

### Accessibility-focused Angular patterns ([Event listeners](https://angular.dev/guide/templates/event-listeners))

> This section focuses on Angular-specific implementation patterns; broader a11y rules live in the accessibility standards doc.

- **MUST** keep interactive behavior on semantic elements (button/link/input) whenever possible.
- **MUST** bind ARIA attributes using attribute binding:
  - Example: `[attr.aria-expanded]="isOpen()"`, `[attr.aria-controls]="panelId()"`. ([Binding guide](https://angular.dev/guide/templates/binding))
- **MUST** support keyboard interaction for custom controls:
  - Use `(keydown)` handlers and ensure focus styles are visible. ([Event listeners](https://angular.dev/guide/templates/event-listeners))
- **SHOULD** manage focus intentionally after view changes (route changes, dialogs, error banners).
  - Prefer focusing a stable element with a `ViewChild` reference and `element.focus()` in response to state changes (avoid doing this in templates).

## 2) Do / Don’t

### Components

- **Do**
  - Keep route components thin and push logic into services/stores.
  - Use `hostDirectives` when a directive encapsulates host behaviors cleanly. ([Directive composition API](https://angular.dev/guide/directives/directive-composition-api))
- **Don’t**
  - Put HTTP calls directly in presentational components.
  - Share mutable objects across component boundaries.

### Signals and RxJS

- **Do**
  - Model state with private writable signals + read-only public API.
  - Use RxJS for cancellation/concurrency and convert to signals at the edge.
- **Don’t**
  - Use effects to “keep two signals in sync” (prefer `computed` or `linkedSignal`).
  - Subscribe in components without `takeUntilDestroyed()` or `AsyncPipe`.

### Templates

- **Do**
  - Use `@for (...; track ...)` and keep `track` stable.
  - Use `@let` to avoid repeating expressions.
- **Don’t**
  - Call functions that allocate new arrays/objects inside the template on every change detection pass.
  - Use `ngClass`/`ngStyle` when a binding is clearer.

### Routing

- **Do**
  - Lazy-load features and keep route configs local to features.
  - Use preloading strategically for “almost-always-used” features.
- **Don’t**
  - Eager-import feature pages into `app.routes.ts`.

## 3) Minimal examples

### 3.1 Standalone component with signals, inputs, outputs, and host bindings

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

type Density = 'comfortable' | 'compact';

@Component({
  selector: 'app-counter-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './counter-card.component.html',
  styleUrl: './counter-card.component.css',
  host: {
    'role': 'group',
    '[class.compact]': 'density() === "compact"',
    '(keydown.enter)': 'increment()',
  },
})
export class CounterCardComponent {
  // Inputs as signals
  initial = input(0);
  density = input<Density>('comfortable');

  // Outputs
  changed = output<number>();

  // Private writable state
  private readonly countWritable = signal(this.initial());

  // Public read API
  readonly count = computed(() => this.countWritable());
  readonly isEven = computed(() => this.count() % 2 === 0);

  increment(): void {
    this.countWritable.update((v) => v + 1);
    this.changed.emit(this.count());
  }

  // Side effects only (telemetry/logging)
  private readonly _log = effect(() => {
    // eslint-disable-next-line no-console
    console.log('Count changed:', this.count());
  });
}
```

```html
<!-- counter-card.component.html -->
<h2>Count: {{ count() }}</h2>

@if (isEven()) {
  <p>Even</p>
} @else {
  <p>Odd</p>
}

<button type="button" (click)="increment()">
  Increment
</button>
```

### 3.2 RxJS → signal boundary (service)

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, shareReplay } from 'rxjs/operators';

type UserDto = { id: string; name: string };

@Injectable({ providedIn: 'root' })
export class UsersDataAccess {
  private readonly http = inject(HttpClient);

  private readonly users$ = this.http.get<UserDto[]>('/api/users').pipe(
    map((rows) => rows ?? []),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  // Signal view for components that prefer signals
  readonly users = toSignal(this.users$, { initialValue: [] as UserDto[] });
}
```

### 3.3 Feature routing with lazy loading + preloading

```ts
// app.routes.ts
import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    data: { preload: true },
  },
];
```

```ts
// main.ts (router setup)
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withPreloading } from '@angular/router';
import { PreloadAllModules } from '@angular/router';
import { AppComponent } from './app/app.component';
import { APP_ROUTES } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),
  ],
});
```

## 4) Common pitfalls and anti-patterns

- **Using `effect()` as a “derived state engine”**
  - If it can be expressed as pure derivation, use `computed()`.
- **In-place mutation of state objects**
  - Mutating arrays/objects without changing references leads to subtle UI bugs and makes state changes hard to reason about.
- **Non-stable `track` expressions in `@for`**
  - Always track by a stable identifier. Tracking by array index often causes DOM churn on inserts/removals. ([Control flow](https://angular.dev/guide/templates/control-flow))
- **Template expressions with allocation**
  - Avoid calling methods that create new arrays/objects each run (sorting, filtering, mapping) directly in templates.
- **Conditional `<ng-content>`**
  - Don’t wrap `<ng-content>` in `@if`/`@for`/`@switch`; Angular still instantiates the content. ([Content projection note](https://angular.dev/guide/components/content-projection))
- **Over-eager preloading**
  - Preloading everything can undo lazy-loading wins. Prefer targeted preloading via route data + a custom strategy. ([Preloading strategies](https://angular.dev/guide/routing/route-preloading-strategies))

## 5) Version watchlist (Angular 20+)

Update this document when any of the following change materially:

- **Signals surface area changes**
  - New signal APIs, semantics changes, or “graduated to stable” transitions. ([Signals](https://angular.dev/guide/signals))
- **RxJS interop changes**
  - Notable changes to `toSignal`, `toObservable`, cleanup semantics, or scheduler behavior. ([RxJS interop](https://angular.dev/api/core/rxjs-interop))
- **SSR/hydration capabilities**
  - If incremental hydration defaults, APIs, or recommended configuration changes.  
  - Watch: `withIncrementalHydration` and related providers. ([withIncrementalHydration](https://angular.dev/api/platform-browser/withIncrementalHydration))
- **Host binding tooling**
  - Language service / type-checking changes for `host` bindings and listeners. ([HostListener note](https://angular.dev/api/core/HostListener))
- **Template control flow**
  - Changes in syntax, performance characteristics, or recommended migration behavior. ([Control flow](https://angular.dev/guide/templates/control-flow))
- **Image optimization**
  - Changes to `NgOptimizedImage` supported modes and required attributes. ([Image optimization](https://angular.dev/guide/image-optimization))
- **Routing defaults**
  - Preloading APIs/behaviors, lazy-loading patterns, or standalone-first router changes. ([Routing](https://angular.dev/guide/routing))
- **Forms direction**
  - If “Signal Forms” moves from experimental to recommended for this repo, this doc must be updated. ([Forms](https://angular.dev/guide/forms))

## 6) Official Angular references (no third-party links)

- [Components](https://angular.dev/guide/components)
- [Signals](https://angular.dev/guide/signals)
- [RxJS interop](https://angular.dev/api/core/rxjs-interop)
- [Templates](https://angular.dev/guide/templates)
- [Control flow](https://angular.dev/guide/templates/control-flow)
- [Routing](https://angular.dev/guide/routing)
- [Route preloading strategies](https://angular.dev/guide/routing/route-preloading-strategies)
- [Dependency injection](https://angular.dev/guide/di)
- [`inject()`](https://angular.dev/api/core/inject)
- [Host elements](https://angular.dev/guide/components/host-elements)
- [Forms](https://angular.dev/guide/forms)
- [Image optimization](https://angular.dev/guide/image-optimization)
