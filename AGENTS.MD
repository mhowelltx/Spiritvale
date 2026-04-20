# Spiritvale

This repository contains the implementation for Spiritvale.

## Read first
Before making architecture or implementation decisions, read these files fully:

- `docs/spiritvale-product-and-simulation-spec.md`
- `docs/spiritvale-technical-implementation-pack.md`

## Working rules
- Treat the simulation engine as canonical.
- AI text generation must never be the source of truth for simulation state.
- Keep the architecture server-authoritative and deterministic.
- Favor small, modular, testable services.
- Prioritize Milestone 1 before deeper lore, AI text polish, or broader feature scope.

## Immediate goal
Plan and implement the MVP foundation in this order:
1. Prisma schema
2. seeded world generator
3. deterministic tick engine
4. one spirit action end-to-end
5. basic dashboard and villager detail UI

## Planning behavior
When in plan mode:
- read the docs first
- identify ambiguities and risks
- propose a pragmatic Milestone 1 slice
- break work into small executable steps
- do not begin coding until the plan is approved
