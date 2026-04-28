# Project State

This file tracks the current phase, active work, decisions, and known risks. Keep it short and update it whenever the roadmap changes.

- **Status**: In Progress
- **Owner**: repo maintainers
- **Last updated**: 2026-01-31
- **Type**: Reference
- **Scope**: current status, decisions, and risks
- **Non-goals**: detailed task lists
- **Applies to**: Biruk’s Egg Deliveries

## Current Phase

- **Focus**: V2 Rewrite — Design & Spec
- **Phase**: Phase 03 (V2 Planning — in progress in `nonprofit-delivery-pwa` repo)

## Done

- Adaptation of workflows to Antigravity (Complete).
- GSD Planning adoption (Complete).
- UI Refactor: "Release Info" UI consolidated (Complete).
- V2 rewrite decision made (2026-04-27): new repo `nonprofit-delivery-pwa`, self-hosted on `bep.fossum.me`.
- Phase 0 analysis docs written (2026-04-27): feature inventory, lessons learned, data model analysis, story map, design inspiration — all in `nonprofit-delivery-pwa/docs/v1-analysis/`.

## In Progress

- Phase 1 (stack ADR) and Phase 2 (9 spec docs) — active work in `nonprofit-delivery-pwa` repo.

## V2 Rewrite Decision

V1 (this repo) will be superseded by `nonprofit-delivery-pwa`. Key drivers:

- Data lives only on one phone; one restore failure loses everything
- StorageService is a 1480-line monolith; fragile to change
- Route order corruption required a hidden repair workflow
- CSV round-trip is the only backup mechanism
- Phone-only layout; no desktop value density
- Route optimizer is a separate CLI, not integrated

V2 stack: React 19 + Vite PWA · FastAPI + PostgreSQL 16 · Docker Compose · local-first (Dexie) + server sync.
V1 remains running until V2 migration is confirmed complete.

## Known Risks

- V1 continues to be the production app until V2 migration is confirmed; keep V1 stable.
- VS Code and Antigravity context switching may cause confusion if prompts drift (mitigated by wrapper strategy).
