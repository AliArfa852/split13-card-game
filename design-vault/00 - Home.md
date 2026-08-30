---
tags: [moc]
---
# Check! — Design Vault

Context notes for this codebase, split into three reference areas plus a space for your own redesign work.

## Mechanics
How the game actually plays, straight from `docs/GAME_RULES.md` plus the enums/types that implement it.

[[Game Overview]] · [[Card Values]] · [[Setup & Dealing]] · [[Turn Structure]] · [[Draw Action]] · [[Matching Stage]] · [[Special Abilities]] · [[Hand Grid & Empty Slots]] · [[Calling Check & Round End]] · [[Scoring]] · [[Turn Timers]] · [[Edge Cases]]

## Architecture
How the code is put together — client, server, shared types, network, testing, deployment.

[[Architecture Overview]] · [[Tech Stack]] · [[Client Architecture]] · [[Server Architecture]] · [[Shared Types & Data Structures]] · [[State Management Strategy]] · [[Network Flow]] · [[Testing Strategy]] · [[Deployment]]

## Design
Why the rules and architecture are shaped the way they are — analysis, not documented fact, useful as a checklist before you change something.

[[Design Philosophy]] · [[Core Tension]] · [[Why These Rules Work]]

## Redesign (yours)
Your own scratchpad for turning this into your own game.

[[Redesign Ideas]] · [[House Rules Draft]] · [[Open Questions]] · **[[Split 13 - Game Rules]]** (draft v1 spec for the new game)

---

Sourced from `README.md`, `docs/GAME_RULES.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`, and the code (`shared-types/src/index.ts`, `server/src/game-machine.ts`, `client/machines/uiMachine.ts`) as of 2026-08-30. If the code and these notes disagree later, the code has moved on — re-check against it rather than trusting a note that hasn't been touched in a while.
