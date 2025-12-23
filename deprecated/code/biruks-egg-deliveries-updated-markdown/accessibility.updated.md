# Accessibility standards (WCAG AA)

- **Status**: Stable
- **Owner**: (set per-repo)
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: accessibility requirements and Angular-specific patterns for this repo
- **Applies to**: all user-facing UI, including PWA behavior
- **Non-goals**: full UI style system (see `docs/ux/style-guide.md`)

## Rules (concise, grouped)

### Baseline conformance

- Target **WCAG 2.2 Level AA** as the minimum baseline.
- Do not rely on color alone to convey meaning.
- Ensure all interactive UI works with keyboard-only and screen readers.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Semantic HTML first

- Prefer native elements (`button`, `a`, `input`, `label`, `fieldset`, `legend`) over custom div-based controls.
- Keep the DOM order aligned with visual order when possible.
- Use headings (`h1`–`h6`) to form a meaningful outline.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Forms: labels, errors, and instructions

- Every form control must have an accessible name:
  - Visible label associated using the `for` attribute is preferred.
  - If no visible label, use `aria-label` (last resort).
- Provide error messages that are:
  - Programmatically associated with the control (`aria-describedby`)
  - Visible, specific, and actionable
- Don’t clear user input on validation errors.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [ARIA technique for error identification](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19).

### Keyboard support and focus management

- All interactive components must be fully operable by keyboard:
  - Logical Tab order
  - Visible focus indicator
  - No keyboard traps
- After route navigation, place focus intentionally (example: page heading).
- For modals and overlays, trap focus while open and restore focus on close.

References: [Angular a11y best practices](https://angular.dev/best-practices/a11y), [WCAG 2.2 focus appearance](https://www.w3.org/TR/WCAG22/#focus-appearance).

### Touch targets and mobile PWA

- Ensure touch targets meet minimum size guidance (or provide equivalent spacing).
- Avoid gesture-only interactions; provide a button alternative.

References: [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/TR/WCAG22/#target-size-minimum).

### ARIA usage rules

- Use ARIA only when semantic HTML cannot represent the pattern.
- Never add ARIA that contradicts native semantics.
- When using ARIA, implement the full keyboard interaction model for the pattern.

References: [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/), [Angular Aria](https://angular.dev/guide/aria/overview).

### Dynamic content and announcements

- When content updates without a navigation, ensure screen readers get notified:
  - Use live regions appropriately (`aria-live`, `role="status"`, `role="alert"`)
  - Avoid noisy announcements; announce only what the user needs

Angular options:

- Prefer Angular-provided headless accessibility directives when available (Angular Aria).
- For Angular CDK usage, use `LiveAnnouncer` for consistent announcements.

References: [Angular Aria](https://angular.dev/guide/aria/overview), [Angular CDK a11y](https://material.angular.dev/cdk/a11y/overview), [ARIA live regions (WAI technique)](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19).

### Color contrast and non-text contrast

- Text contrast must meet WCAG AA.
- UI component boundaries (inputs, buttons, focus rings) must meet non-text contrast requirements.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Understanding non-text contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html).

## Do / Don’t

- **Do** use native elements and correct semantics first.
- **Do** provide visible focus styles and preserve focus on UI updates.
- **Do** test keyboard-only paths for every user flow.
- **Don’t** implement custom widgets without the ARIA keyboard model.
- **Don’t** hide focus outlines without a strong replacement.
- **Don’t** use `tabindex` values > 0 (they create confusing focus order).

## Minimal Angular patterns

### Focus management after navigation

```ts
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RouteFocusService {
  private readonly router = inject(Router);

  start(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        // Example: focus the first h1 on the page.
        const heading = document.querySelector('h1') as HTMLElement | null;
        heading?.focus();
      });
  }
}
```

Notes:

- Ensure the target element is focusable (`tabindex="-1"` is common for headings).
- Avoid focusing inside a component that might not exist yet; focus after navigation end.

Reference: [Angular a11y best practices](https://angular.dev/best-practices/a11y).

### Error message association

```html
<label for="dozens">Dozens</label>
<input id="dozens" type="number" aria-describedby="dozens-help dozens-error" />
<p id="dozens-help">Enter a whole number.</p>
<p id="dozens-error" role="alert">Dozens is required.</p>
```

## Common pitfalls

- Using `div`/`span` as buttons without role, keyboard handling, and focus management.
- Adding `aria-label` but also rendering a visible label that says something different.
- Announcing too much content in live regions, making the app unusable for screen reader users.
- Losing focus after route navigation, causing “silent” page changes.
- Relying on placeholder text as a label.
