---
name: project-standards
description: Angular, TypeScript, and accessibility standards for this workspace.
applyTo: "**/*"
---

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices in this workspace.

## TypeScript Best Practices

- Use strict type checking.
- Prefer type inference when the type is obvious.
- Avoid the `any` type; use `unknown` when the type is uncertain.

## Angular Best Practices

- Always use standalone components over NgModules.
- Do **not** set `standalone: true` inside Angular decorators (it's the default in Angular v20+).
- Use signals for state management.
- Implement lazy loading for feature routes.
- Do **not** use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead.
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- All UI changes must pass AXE checks.
- Follow WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility.
- Use `input()` and `output()` functions instead of decorators.
- Use `computed()` for derived state.
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorators.
- Prefer inline templates for small components.
- Prefer reactive forms instead of template-driven ones.
- Do **not** use `ngClass`; use `class` bindings instead.
- Do **not** use `ngStyle`; use `style` bindings instead.
- When using external templates/styles, use paths relative to the component TypeScript file.

## State Management

- Use signals for local component state.
- Use `computed()` for derived state.
- Keep state transformations pure and predictable.
- Do **not** use `mutate` on signals; use `update` or `set` instead.

## Templates

- Keep templates simple and avoid complex logic.
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use the async pipe to handle observables.
- Do not assume globals like `new Date()` are available.
- Do not write arrow functions in templates (they are not supported).

## Services

- Design services around a single responsibility.
- Use the `providedIn: 'root'` option for singleton services.
- Use the `inject()` function instead of constructor injection.

