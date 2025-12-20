# Biruk's Egg Project Deliveries - Style Guide

This style guide defines an iOS-inspired visual system for the Biruk's Egg Project Deliveries PWA. It focuses on clarity, touch-friendly layouts, and offline-first practicality for daily field use.

- **Status**: Draft
- **Owner**: repo maintainers
- **Last updated**: 2025-12-19
- **Type**: Reference
- **Scope**: visual system, UI components, and interaction patterns
- **Non-goals**: implementation details for specific Angular components
- **Applies to**: `src/app/**`

## Overview and design philosophy

Biruk's Egg Project Deliveries is a small offline-first utility app used daily in the field. The primary user needs a calm interface that is easy to read in a car or at a doorstep.

The design language is modern and minimalist, leaning on iOS conventions (system fonts, large titles, rounded cards) so the PWA feels native on iPhone. The sections below define foundations, components, motion, tokens, and example layouts.

## Foundations

### Layout and breakpoints

- **Viewport and content width**: Design for iPhone portrait widths ~320px (iPhone SE) up to ~430px. Use a single-column layout and cap the content width around 420px so text and cards do not stretch too wide on larger phones.
- **App shell structure**: Wrap content in a root shell to centralize padding and width limits.

  ```html
  <div class="app-shell">
    <header class="app-header">...</header>
    <main class="app-content">...</main>
    <footer class="app-footer">...</footer>
  </div>
  ```

  Use `max-width: 420px` and `margin: 0 auto` on the shell, with base horizontal padding (for example, 16px).

- **Spacing system**: Adopt an 8px base grid.
  - Common values: 4, 8, 16, 24, 32px.
  - Page side padding: 16px.
  - Gaps between stacked elements: 8px or 12px.
  - Section margins: 24px.
- **Safe areas**: Respect notch and home indicator insets using CSS environment variables [1].

  ```css
  .app-header {
    padding-top: env(safe-area-inset-top, 16px);
  }

  .app-footer {
    padding-bottom: env(safe-area-inset-bottom, 16px);
  }
  ```

  iPhones typically need ~44px top safe padding and ~34px bottom in portrait, so these values keep content clear of the notch and home indicator.

- **Layout regions**:
  - **Header**: Top bar with title or logo. Include safe area padding. Typical height is ~56px plus the top inset.
  - **Main content**: Scrollable area for lists, cards, and forms, centered with horizontal padding and a light gray background.
  - **Footer or bottom bar**: Used on action-heavy screens (Delivery Run). Fixed to bottom with safe area padding and ~56px height plus inset.

### Color system

Use a simple, high-contrast palette that reads well outdoors and meets WCAG AA for text.

- **Background** (`--color-bg`): `#F3F4F6` for the app background.
- **Surface** (`--color-surface`): `#FFFFFF` for cards and primary surfaces.
- **Primary text** (`--color-text`): `#111827` for titles and body text.
- **Secondary text** (`--color-text-muted`): `#6B7280` for labels and secondary info.
- **Primary accent** (`--color-primary`): `#F59E0B` for primary actions.
- **Primary accent dark** (`--color-primary-dark`): `#D97706` for hover or pressed states.
- **Success** (`--color-success`): `#10B981` for success indicators.
- **Danger** (`--color-danger`): `#EF4444` for destructive actions and errors.
- **Border or divider** (`--color-border`): `#E5E7EB` for subtle separators.

Usage and contrast notes:

- Use the primary accent for interactive highlights (primary buttons, selected states, focus rings).
- For text on colored backgrounds, use white text and confirm contrast.
- The amber accent on white is borderline for small text. Use `--color-primary-dark` or larger text sizes when you need amber text on white.

If you add dark mode later, invert the background and surface tokens and adjust text and accent values so contrast remains AA compliant.

### Typography system

- **Font family**: Use the system font stack so iOS renders the native SF font [4].

  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  ```

- **Base size**: 16px for body text (iOS defaults are around 17pt) [2].
- **Scale**:
  - **Large title**: 32px, bold.
  - **Section header**: 22px, semibold.
  - **Card title**: 18px, semibold.
  - **Body text**: 16px, regular.
  - **Secondary text**: 14px to 15px, regular.
  - **Caption**: 12px to 13px, regular.
  - **Button text**: 16px to 18px, semibold.
  - **Tiny labels**: 10px to 12px, only when unavoidable [2].
- **Weights**: Regular (400), medium or semibold (500 to 600), bold (700).
- **Line heights**:
  - Large titles: ~1.1.
  - Body text: ~1.4.
  - Captions: ~1.3.
- **Truncation and wrapping**: Use `text-overflow: ellipsis` for single-line fields. Allow key fields like stop names to wrap to two lines instead of shrinking too small.

### Spacing and sizing

- **Base unit**: 8px.
- **Padding and margin**:
  - Section top margins: ~24px.
  - Vertical spacing between form fields or list items: 16px.
  - Small gaps between label and value: 4px or 8px.
  - Card inner padding: 16px.
- **Touch target size**: Minimum 44px for any tappable element [2].
- **Button size**: 52px preferred height, 48px acceptable, never below 44px [2].
- **Card and list item size**: List rows should be at least 56px tall to fit two lines of text.
- **Icon size**:
  - Icons with text: 16px to 20px.
  - Standalone icons: 24px container with a 16px graphic.
- **Corner radii**:
  - Cards: 12px.
  - Buttons: 12px (or pill for primary if desired).
  - Inputs and toasts: 8px to 9999px (pill).
- **Elevation and shadows**: Keep depth subtle. Use a small card shadow like `0 1px 3px rgba(0,0,0,0.1)` and avoid heavy multi-layer shadows.

### Iconography and imagery

- **Icon style**: Prefer thin outline icons similar to iOS SF Symbols or a minimalist icon set.
- **Usage**: Icons should reinforce labels, not replace them. Use icons for import, backup, status, and drag handles only when they clarify meaning.
- **Color**: Match icon color to the surrounding text or the action color. Avoid a rainbow of icon colors.
- **Size and touch**: Never make the icon itself the tap target. Wrap it in a 44px touch area.
- **Images**: Keep imagery minimal. The app is utility-first, so avoid decorative images that compete with content.

### Safe area and platform adaptiveness

- Use `env(safe-area-inset-*)` for fixed headers, footers, and floating elements [1].
- If you place toasts or floating buttons near the bottom, offset them by the bottom inset plus 16px.
- The app is primarily portrait, but it should not break in landscape. If needed, add `padding-left` and `padding-right` using the left and right insets.
- Avoid `100vh` on iOS Safari. Prefer `min-height: 100%` on the app shell with `height: 100%` on `html, body`.

## Components

### App shell and header

- **Header style**: Use a simple top bar with title and optional logo. Keep it minimal so content stays dominant.
- **Large title on Home**: Use a large title (32px to 34px) on the Home screen to match iOS large-title patterns [2].
- **Header height and safe area**: Minimum 44px plus top inset, with 16px horizontal padding.
- **Content alignment**: Left-align title and logo.
- **Translucency (optional)**: A subtle blur can mimic iOS navigation bars but is optional.
- **Back button**: If present, use a chevron icon and ensure a 44px tap target.
- **Week toggle**: Prefer a segmented control with two options (Week A, Week B).

Example header markup:

```html
<header class="app-header">
  <div class="header-content">
    <span class="logo-badge" aria-hidden="true"></span>
    <h1 class="app-title">Deliveries</h1>
  </div>
</header>
```

### Cards (content containers)

- **General card style**: White background, 12px radius, 16px padding, subtle shadow or light border.
- **Delivery card structure**:
  - **Top meta**: "Stop X of N" label and a progress bar.
  - **Primary info**: Stop name in 18px semibold.
  - **Address**: 14px to 16px, muted.
  - **Quantity**: Prominent "X dozen" line.
  - **Notes**: Optional, muted, and separated from primary info.
  - **Status**: If a stop is already delivered or skipped, use a subtle badge or text label.
- **List rows**: For the route planner, use list rows with white surfaces and light separation rather than heavy card stacking (see Lists section).
- **Summary cards**: Use small summary cards for totals or status counts when needed.

### Buttons

- **Primary buttons**:
  - **Style**: Filled with `--color-primary`, white text, semibold, 16px to 18px.
  - **States**:
    - Default: amber background, white text.
    - Hover (desktop): `--color-primary-dark`.
    - Active: `--color-primary-dark` plus a subtle press effect.
    - Disabled: gray background and muted text.
- **Secondary buttons**:
  - **Style**: Outline or tonal button with amber text.
  - **States**: Light fill or border on press; disabled uses gray border and text.
- **Tertiary buttons**:
  - **Style**: Text-only, minimal emphasis. Use amber for normal actions or red for destructive ones.
  - **Touch**: Wrap in a 44px tap target even if it looks like a link.
- **Placement**:
  - Primary on the right in dialogs, secondary on the left.
  - On delivery cards, place primary and secondary side by side or stacked full width with 8px gap.
- **Global button styles**: Use a shared base class and variants.

  ```css
  .btn {
    font: 500 16px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    border-radius: 12px;
    padding: 12px 16px;
    display: inline-block;
    text-align: center;
  }

  .btn-primary {
    background: var(--color-primary);
    color: #fff;
    border: none;
  }

  .btn-primary:active {
    background: var(--color-primary-dark);
  }

  .btn-secondary {
    background: #fff;
    color: var(--color-primary);
    border: 2px solid var(--color-primary);
  }

  .btn-secondary:active {
    background: rgba(245, 158, 11, 0.1);
  }

  .btn-text {
    background: transparent;
    color: var(--color-primary);
    padding: 8px;
    border: none;
  }

  .btn-text:active {
    opacity: 0.7;
  }
  ```

- **Focus states**: Use `:focus-visible` with a 2px outline so keyboard or VoiceOver users can see focus.

### Form controls

- **Selects**: Use native `select` for Week A / Week B. Style height to 44px, add padding, and keep typography consistent.
- **Text inputs**: Use a 1px border, 8px radius, 8px padding, and muted placeholders.
- **Labels**: Use 14px medium, muted color, and place labels above fields.
- **File inputs**: Hide the raw `input` and trigger it from a styled button. Keep the label clear.

  ```html
  <input type="file" id="csvInput" hidden /> <button class="btn-secondary" type="button">Import CSV</button>
  ```

- **Native pickers**: If you ever add dates or times, use native `input` types so iOS provides familiar pickers.

Example form control styles:

```css
select,
input,
textarea {
  font: 400 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
}
```

### Lists (route planner)

- **List container**: Use a simple list container with vertical spacing.
- **Row style**: Full-width white row, 8px radius, 12px vertical padding, 16px horizontal padding.
- **Layout**: Left-aligned name and city; right-aligned quantity and optional status.
- **Interaction**: Light gray active state on tap.

Example markup:

```html
<div class="route-item">
  <div class="stop-info">
    <div class="stop-name">Alice's Diner</div>
    <div class="stop-city text-muted">Sioux Falls, SD</div>
  </div>
  <div class="stop-meta">
    <span class="stop-count">5 dz</span>
    <span class="drag-handle" aria-hidden="true">::</span>
  </div>
</div>
```

Example styles:

```css
.route-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
}

.stop-name {
  font-size: 16px;
  font-weight: 500;
}

.stop-city {
  font-size: 14px;
  color: #6b7280;
}

.stop-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.route-item:active {
  background: #f3f4f6;
}
```

### Bottom action bar

- **Design**: Fixed bottom bar with two large buttons (Deliver and Skip).
- **Style**: White or lightly translucent background with a top border.
- **Safe area**: Include bottom inset padding.
- **Visibility**: Only present during the delivery run.

Example styles:

```css
.bottom-bar {
  position: fixed;
  bottom: 0;
  width: 100%;
  display: flex;
  gap: 8px;
  padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0));
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-top: 1px solid #e5e7eb;
}
```

### Progress indicators

- **Progress bar**: Thin bar (4px) with a light gray track and amber or green fill.
- **Placement**: Above or inside the delivery card, near the "Stop X of N" label.
- **Animation**: Animate width changes with a 200ms to 300ms ease-out transition.
- **Loading states**: Use a small spinner or inline status text for longer operations (import, backup).

### Toasts and notifications

- **Style**: Pill-shaped, dark translucent background, white text, 14px font.
- **Position**: Bottom center, above the bottom bar and safe area inset.
- **Animation**: Slide and fade in, then auto-dismiss after ~2 seconds.
- **Messaging**: Short and clear ("Marked delivered", "Backup completed").

## Motion and interaction guidelines

- **Durations and easing**: Keep most animations between 200ms and 300ms, using ease-out.
- **Screen transitions**: Slide new screens in from the right and back out to the right to mimic iOS push/pop.
- **Delivery card transition**: Fade out the current card while the next slides in from below.
- **Button feedback**: Use a quick press effect (scale to 0.97 and darken the background).
- **Toast animation**: Use simple translate and opacity transitions.

  ```css
  .toast-enter {
    transform: translateY(20px);
    opacity: 0;
  }

  .toast-enter-active {
    transform: translateY(0);
    opacity: 1;
    transition: transform 300ms ease, opacity 300ms ease;
  }

  .toast-exit-active {
    transform: translateY(20px);
    opacity: 0;
    transition: transform 300ms ease, opacity 300ms ease;
  }
  ```

- **Reduced motion**: Respect `prefers-reduced-motion` and disable motion-heavy transitions.

  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation-duration: 0ms !important;
    }
  }
  ```

## Theming and design tokens

### Token list

- **Color tokens**:
  - `--color-bg`: `#F3F4F6`
  - `--color-surface`: `#FFFFFF`
  - `--color-text`: `#111827`
  - `--color-text-muted`: `#6B7280`
  - `--color-primary`: `#F59E0B`
  - `--color-primary-dark`: `#D97706`
  - `--color-success`: `#10B981`
  - `--color-danger`: `#EF4444`
  - `--color-border`: `#E5E7EB`
- **Typography tokens**:
  - `--font-family-base`: system font stack
  - `--font-size-xl`: 32px
  - `--font-size-lg`: 22px
  - `--font-size-md`: 18px
  - `--font-size-base`: 16px
  - `--font-size-sm`: 14px
  - `--font-size-xs`: 12px
  - `--font-weight-regular`: 400
  - `--font-weight-medium`: 500
  - `--font-weight-semibold`: 600
  - `--font-weight-bold`: 700
- **Spacing tokens**:
  - `--spacing-1`: 4px
  - `--spacing-2`: 8px
  - `--spacing-3`: 12px
  - `--spacing-4`: 16px
  - `--spacing-6`: 24px
  - `--spacing-8`: 32px
- **Sizing tokens**:
  - `--size-min-tap`: 44px
  - `--size-button-height`: 52px
  - `--radius-sm`: 4px
  - `--radius-md`: 8px
  - `--radius-lg`: 12px
  - `--radius-pill`: 9999px
  - `--shadow-card`: `0 1px 3px rgba(0,0,0,0.1)`
  - `--shadow-modal`: `0 4px 8px rgba(0,0,0,0.2)`
- **Motion tokens**:
  - `--duration-fast`: 150ms
  - `--duration-base`: 300ms
  - `--easing-standard`: `cubic-bezier(0.4, 0, 0.2, 1)`
  - `--easing-ease-out`: `cubic-bezier(0, 0, 0.2, 1)`
  - `--easing-ease-in`: `cubic-bezier(0.4, 0, 1, 1)`

### Example token definitions

```css
:root {
  --color-bg: #f3f4f6;
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-primary: #f59e0b;
  --color-primary-dark: #d97706;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-border: #e5e7eb;

  --font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-size-xl: 32px;
  --font-size-lg: 22px;
  --font-size-md: 18px;
  --font-size-base: 16px;
  --font-size-sm: 14px;
  --font-size-xs: 12px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-modal: 0 4px 8px rgba(0, 0, 0, 0.2);

  --duration-fast: 150ms;
  --duration-base: 300ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

### Example usage

```css
body {
  background: var(--color-bg);
  font-family: var(--font-family-base);
  color: var(--color-text);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-4);
}

h1 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.text-muted {
  color: var(--color-text-muted);
}

.btn-primary {
  background: var(--color-primary);
  transition: background var(--duration-fast) var(--easing-ease-out);
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}
```

If you use Tailwind, map these tokens into the theme so the same values power utility classes.

## Logo and app icon usage

### PWA icon (home screen)

- Use the primary amber (`#F59E0B`) as the icon background so the white logo has strong contrast.
- Center the logo with 10% to 15% padding on each side.
- Remove any small text from the icon version; icons should be symbol-only.

### In-app usage (header and branding)

- If the logo appears in the header, place it on a colored badge or in a colored square so the white logo stays visible.
- Keep branding minimal. A small logo plus a large title is enough.
- Avoid white-on-white logos on the light background.

### Complementary backgrounds

- Use warm neutrals if you need a highlight background (for example, a pale yellow for empty states).
- Avoid introducing many extra colors. The app should stay calm and neutral.

## Example layouts for key screens

### Home / dashboard screen

- **Purpose**: Entry point to import data, select week, review summary stats, and start the route.
- **Layout**:
  - Large title (32px) near the top with 16px side padding.
  - Week segmented control below the title.
  - Summary card for total stops and progress.
  - Secondary actions (Import CSV, Backup) below the summary.
  - Primary "Start Route" button near the bottom.
- **Measurements**:
  - Title margin-top: safe area + 16px.
  - Week toggle height: 36px to 44px.
  - Summary card padding: 12px to 16px.
  - Primary button height: 52px.

Example markup:

```html
<main class="home-screen">
  <h1 class="page-title">Deliveries</h1>

  <div class="week-toggle">
    <button class="segmented active">Week A</button>
    <button class="segmented">Week B</button>
  </div>

  <div class="route-summary card">
    <p>Total stops: 12</p>
    <p>Delivered: 0 &bull; Skipped: 0</p>
  </div>

  <button class="btn-primary start-route">Start Route</button>

  <div class="backup-row">
    <span class="text-muted">Last backup: 3 days ago</span>
    <button class="btn-text backup-btn">Backup now</button>
  </div>
</main>
```

Example styles:

```css
.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 60px 16px 16px;
}

.week-toggle {
  display: flex;
  margin: 0 16px 16px;
  background: #e5e7eb;
  border-radius: 999px;
}

.week-toggle .segmented {
  flex: 1;
  padding: 8px;
  font-size: 14px;
  border: none;
  border-radius: 999px;
}

.week-toggle .active {
  background: #f59e0b;
  color: #fff;
}

.route-summary {
  margin: 0 16px 16px;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.start-route {
  margin: 8px 16px 16px;
}

.backup-row {
  margin: 8px 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### Route planner screen

- **Purpose**: View and reorder stops before starting the delivery run.
- **Layout**:
  - Standard header with back button and title.
  - Optional sort control near the top.
  - Scrollable list of route items.
- **Measurements**:
  - Header height: 56px plus safe area.
  - Row height: ~60px for two-line content.

Example markup:

```html
<header class="app-header">
  <button class="back-btn" type="button">Back</button>
  <h2 class="header-title">Route Planner</h2>
</header>

<main class="route-planner-screen">
  <div class="route-item">
    <div class="stop-info">
      <div class="stop-name">Alice's Diner</div>
      <div class="stop-city text-muted">Sioux Falls, SD</div>
    </div>
    <div class="stop-meta">
      <span class="stop-count">5 dz</span>
      <span class="drag-handle" aria-hidden="true">::</span>
    </div>
  </div>
</main>
```

Example styles:

```css
.route-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 0 16px 8px;
}

.stop-count {
  font-size: 16px;
  font-weight: 500;
}

.drag-handle {
  font-size: 18px;
  color: #9ca3af;
}
```

### Delivery run screen (stop card view)

- **Purpose**: Focus on a single stop with Deliver and Skip actions.
- **Layout**:
  - Minimal header with back control (optional).
  - Progress label and progress bar.
  - Delivery card with stop name, address, quantity, and notes.
  - Bottom action bar with Deliver and Skip.
- **Measurements**:
  - Progress bar height: 4px.
  - Bottom bar height: 56px plus safe area.

Example markup:

```html
<header class="run-header">
  <button class="back-btn" type="button">Back</button>
  <div class="route-label text-muted">Week A Route</div>
</header>

<main class="delivery-run-screen">
  <div class="progress-section">
    <span class="stop-count-label">Stop 3 of 10</span>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width: 30%"></div>
    </div>
  </div>

  <div class="delivery-card card">
    <h2 class="stop-name">Bob's Grocery</h2>
    <p class="stop-address">123 Elm St, Springfield, SD 57055</p>
    <p class="stop-quantity"><strong>4</strong> dozen</p>
    <p class="stop-notes text-muted">Note: Leave at front desk if no answer.</p>
  </div>
</main>

<div class="bottom-bar">
  <button class="btn-primary">Deliver</button>
  <button class="btn-secondary">Skip</button>
</div>
```

Example styles:

```css
.stop-count-label {
  font-size: 14px;
  color: #6b7280;
  margin: 8px 0;
  display: block;
  text-align: center;
}

.progress-bar-bg {
  background: #e5e7eb;
  border-radius: 4px;
  height: 4px;
  width: 100%;
}

.progress-bar-fill {
  background: #10b981;
  height: 4px;
  width: 30%;
  border-radius: 4px;
}

.delivery-card {
  margin: 16px;
}

.delivery-card .stop-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.delivery-card .stop-address {
  font-size: 16px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.delivery-card .stop-quantity {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.delivery-card .stop-notes {
  font-size: 14px;
  color: #6b7280;
}
```

## iOS native feel considerations

- Use the system font and iOS-like sizing so text feels familiar [2].
- Respect safe area insets for headers, footers, and floating elements [1].
- Prefer large titles on the home screen and standard titles on deeper screens [2].
- Use subtle translucency for top or bottom bars if you want an iOS-style blur.
- Avoid Material ripple effects. Use a simple press highlight instead.
- Keep gestures consistent. Provide a back button since PWA swipe-back is not guaranteed.
- Keep scroll behavior simple (avoid nested scroll containers).

## Implementation notes (CSS and Angular integration)

- **Global styles**: Define variables in `:root` and apply base typography in `styles.scss`.
- **Safe area support**: Ensure `viewport-fit=cover` is set in the HTML `meta` viewport tag [12].
- **Component styling**: Use class bindings rather than `ngClass` or `ngStyle` for state changes.
- **Images**: Use Angular `NgOptimizedImage` for static images and avoid base64 for image assets.
- **Utilities**: If you use Tailwind, map the tokens into the theme; otherwise use simple utility classes like `.text-muted` or `.btn-primary`.
- **Dark mode (future)**: Use `@media (prefers-color-scheme: dark)` to swap token values.
- **Testing**: Verify on a real iPhone or iOS simulator in both browser and installed PWA modes.

## Related docs

- `docs/ux/ux-overview.md`
- `docs/dev/best-practices/accessibility.md`
- `docs/dev/best-practices/angular-standards.md`
- `docs/architecture/architecture-overview.md`

## Sources

- [1] Considering iOS Safe Area in your App Designs - <https://createwithplay.com/blog/considering-ios-safe-area>
- [2] iOS 17 Design Guidelines: Illustrated Patterns - <https://www.learnui.design/blog/ios-design-guidelines-templates.html>
- [4] Progressive Web App Design: Hidden UX Techniques That Users Want - <https://www.netguru.com/blog/pwa-ux-techniques>
- [12] Customising an iOS home screen web app in 2021 - <https://johan.im/writings/ios-homescreen-web-app/>
