---
tags: [architecture]
---
Up: [[00 - Home]]

# Architecture Overview

Monorepo, npm workspaces, three packages: `client`, `server`, `shared-types`.

**Core philosophy** (from `docs/ARCHITECTURE.md`):
- **Authoritative server** — single source of truth via XState (`server/src/game-machine.ts`). Every action is validated server-side; hidden info is redacted before broadcast, so a modified client can't change outcomes or see what it shouldn't.
- **Global, persistent client state** — one XState actor at the root of the React tree, covering everything from pre-game modals to reconnection.
- Next.js (App Router) + TypeScript + Tailwind + Framer Motion on the front end for a real-time, animated feel.

Breakdown:
- [[Client Architecture]] — the `uiMachine`, key directories, component tree.
- [[Server Architecture]] — `game-machine.ts`, socket handling, redaction.
- [[Shared Types & Data Structures]] — the contract between the two halves.
- [[State Management Strategy]] — authoritative-server vs view-state split.
- [[Network Flow]] — a full request/response trip, event names.
- [[Tech Stack]] — technology list per package.
- [[Testing Strategy]] · [[Deployment]]

This is the layer you'll be touching if a redesign changes *how* state moves, not just what the rules say — see [[Redesign Ideas]].
