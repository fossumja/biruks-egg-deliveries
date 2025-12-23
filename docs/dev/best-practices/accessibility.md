# Accessibility Standards

This document defines baseline accessibility requirements for the app, including Angular-specific patterns for UI behavior and announcements.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-22
- **Type**: Reference
- **Scope**: accessibility requirements for UI, content, and interactions
- **Non-goals**: visual styling details or UX layout decisions
- **Applies to**: `src/app/**`

## Baseline requirements

- Target WCAG 2.2 Level AA for all user-facing views.
- All UI changes must pass axe checks.
- Keyboard and screen reader users must be able to complete core flows.
- Do not rely on color alone to convey meaning.

## Semantics and structure

- Use native elements for their intended purpose (button, link, input, form).
- Keep a logical heading order and meaningful landmarks.
- Keep DOM order aligned with the visual order when possible.
- Avoid clickable divs. If a custom element is unavoidable, mirror native semantics and keyboard behavior.

## Focus and keyboard

- Every interactive element is reachable via keyboard and has a visible focus state.
- Do not remove focus outlines without a replacement.
- Manage focus after view changes, modal open/close, and validation errors.
- Ensure focus is trapped inside open dialogs and returned to the trigger on close.
- Do not use `tabindex` values greater than `0`.

## Forms and validation

- Every input has a visible label and a programmatic label association.
- Error messages are linked using `aria-describedby` and toggled with `aria-invalid`.
- Provide a summary or banner for form-level errors with a clear next action.
- Do not rely on placeholder text as a label.
- Do not clear user input on validation errors.

## Dynamic content and announcements

- Use live regions for non-navigation updates (`aria-live`, `role="status"`, `role="alert"`).
- Announce only what the user needs to proceed; avoid noisy live regions.
- Prefer Angular CDK `LiveAnnouncer` when you need consistent, testable announcements.

## Color, contrast, and motion

- Text contrast meets 4.5:1 for body text and 3:1 for large text.
- UI component boundaries, focus rings, and icons meet non-text contrast requirements.
- Include non-color indicators for status and validation (icon, text, or pattern).
- Respect `prefers-reduced-motion` and avoid motion-heavy transitions by default.

## Touch targets and mobile PWA requirements

- Minimum touch target size is 44px by 44px.
- Ensure tap targets have enough spacing to avoid accidental taps.
- Do not rely on hover-only interactions.
- Respect safe area insets for fixed headers and footers.

## ARIA usage

- Use ARIA only when native elements cannot express the needed behavior.
- Keep ARIA state in sync with UI state (`aria-expanded`, `aria-pressed`, `aria-selected`).
- When using ARIA, implement the full keyboard interaction model for the pattern.

## Images and icons

- Provide meaningful alt text for informative images.
- Decorative images should use empty alt text.
- Icons that act as buttons must include visible text or an accessible label.

## Minimal patterns

### Error message association

```html
<label for="dozens">Dozens</label>
<input
  id="dozens"
  type="number"
  aria-describedby="dozens-help dozens-error"
  aria-invalid="true"
/>
<p id="dozens-help">Enter a whole number.</p>
<p id="dozens-error" role="alert">Dozens is required.</p>
```

### Focus after navigation (route-level)

```ts
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RouteFocusService {
  private readonly router = inject(Router);

  start(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const heading = document.querySelector('h1') as HTMLElement | null;
        heading?.focus();
      });
  }
}
```

Notes:

- Make the target focusable (for example: `tabindex="-1"` on the `h1`).
- Focus after navigation completes to avoid focusing a missing element.

## Accessibility testing checklist

- Run axe on the updated view and resolve violations.
- Keyboard-only walkthrough of import, planner edits, run flow, and export.
- Screen reader check for primary flows (VoiceOver on iOS when possible).
- Validate contrast for primary and secondary text against current backgrounds.

## Common pitfalls

- Using `div`/`span` as buttons without role, keyboard handling, and focus management.
- Adding `aria-label` while also rendering a visible label that says something different.
- Announcing too much content in live regions and creating noise.
- Losing focus after navigation, causing silent page changes.
- Relying on placeholder text as a label.

## What changed / Why

- Expanded baseline to WCAG 2.2 AA and added live region guidance for dynamic content.
- Added minimal patterns and a pitfalls list to make review expectations explicit.

## Related docs

- `docs/ux/style-guide.md`
- `docs/ux/ux-overview.md`
- `docs/dev/best-practices/angular-standards.md`
- `docs/dev/best-practices/testing-practices.md`
- `docs/testing/regression-tests.md`
