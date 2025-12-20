# Accessibility Standards

This document defines baseline accessibility requirements for the app. It complements the UX style guide and Angular standards with non-negotiable a11y rules.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: accessibility requirements for UI, content, and interactions
- **Non-goals**: visual styling details or UX layout decisions
- **Applies to**: `src/app/**`

## Baseline requirements

- Meet WCAG AA for all user-facing views.
- All UI changes must pass axe checks.
- Keyboard and screen reader users must be able to complete core flows.

## Semantics and structure

- Use native elements for their intended purpose (button, link, input, form).
- Keep a logical heading order and meaningful landmarks.
- Do not use only color or position to convey meaning.
- Avoid clickable divs. If a custom element is unavoidable, mirror native semantics and keyboard behavior.

## Focus and keyboard

- Every interactive element is reachable via keyboard and has a visible focus state.
- Do not remove focus outlines without a replacement.
- Manage focus after view changes, modal open and close, and validation errors.
- Ensure focus is trapped inside open dialogs and returned to the trigger on close.

## Forms and validation

- Every input has a visible label and a programmatic label association.
- Error messages are linked using `aria-describedby` and toggled with `aria-invalid`.
- Provide a summary or banner for form-level errors with a clear next action.
- Do not rely on placeholder text as a label.

## Color, contrast, and motion

- Text contrast meets 4.5:1 for body text and 3:1 for large text.
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
- Use `aria-live` for non-blocking status updates (toasts, save confirmations).

## Images and icons

- Provide meaningful alt text for informative images.
- Decorative images should use empty alt text.
- Icons that act as buttons must include visible text or an accessible label.

## Accessibility testing checklist

- Run axe on the updated view and resolve violations.
- Keyboard-only walkthrough of import, planner edits, run flow, and export.
- VoiceOver check on iOS for primary flows.
- Validate contrast for primary and secondary text against current backgrounds.

## Related docs

- `docs/ux/style-guide.md`
- `docs/ux/ux-overview.md`
- `docs/dev/best-practices/angular-standards.md`
- `docs/dev/best-practices/testing-practices.md`
- `docs/testing/regression-tests.md`
