# Project: Biruk’s Egg Deliveries
This document defines the high-level vision, constraints, and non-goals. It is the short, stable reference that guides roadmap and phase planning.

- **Status**: Stable
- **Owner**: repo maintainers
- **Last updated**: 2026-01-31
- **Type**: Reference
- **Scope**: project vision, constraints, and non-goals
- **Non-goals**: detailed mechanics or implementation specs
- **Applies to**: Biruk’s Egg Deliveries

## Vision

- **Offline-first**: Enable full operation without internet connection once data is imported.
- **Mobile-optimized**: Designed for iPhone home-screen use (PWA).
- **Streamlined Delivery**: Plan and record egg deliveries efficiently.
- **Data Ownership**: Simple CSV import/export for data portability and backup.

## Product Principles

- **Reliability first**: The app must work when the user is standing in a driveway with no signal.
- **Speed**: Recording a delivery should be instant (minimal taps).
- **Simplicity**: Hide complexity (tax years, data persistence) behind simple UIs.

## Constraints

- **Tech Stack**: Angular PWA (see `package.json`).
- **Data Persistence**: LocalStorage/IndexedDB with CSV export as backup.
- **Accessibility**: WCAG AA minimums.
- **Process**: Follow V-model gates (test logs, validation) before implementation.

## Non-goals

- **Cloud Sync**: No backend server or real-time sync across devices.
- **Payment Processing**: No in-app payments.
- **Complex Routing**: No maps integration or route optimization algorithms (manual ordering only).

## Source of Truth

- **Repo Standards**: `AGENTS.md`, `docs/dev/workflows/`, `docs/dev/best-practices/`.
- **Docs**: `index.md` is the documentation entry point.
