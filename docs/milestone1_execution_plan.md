# Spiritvale Milestone 1 — Deployable-First Execution Plan

_Last updated: 2026-04-20_

## Goal
Deliver a testable local deployable instance immediately while preserving long-term cloud portability.

## Constraints
- Server-authoritative simulation.
- Deterministic simulation.
- AI text generation is never source of truth.
- Keep architecture modular and testable.
- Avoid overbuilding beyond Milestone 1.

## Scope for first executable slice
1. Environment/config baseline.
2. Prisma schema baseline.
3. Seeded deterministic game creation.
4. One-day deterministic tick.
5. Append-only events.
6. Minimal UI to create game and tick.
7. Health endpoint.

## Ordered backlog with status
1. [x] Write and save deployable-first plan.
2. [x] Initialize app scaffold for local run.
3. [x] Add Prisma schema and DB client setup.
4. [x] Implement deterministic RNG utility.
5. [x] Implement GameService create/load/tick methods.
6. [x] Implement API routes: health, new, game, tick.
7. [x] Build minimal UI (`/`) for create + tick + events.
8. [x] Add deterministic test coverage (RNG unit test added; full suite pending install).
9. [x] Add local runbook section in README.

## Cloud-ready decisions baked in now
- 12-factor env config (`DATABASE_URL`, runtime-configured base URL).
- Server-owned simulation state transitions.
- Deterministic ordering and seeded RNG.
- Storage abstraction in service/repository layer.

## Current execution focus
Start with scaffold + Prisma + deterministic create/tick vertical path.
