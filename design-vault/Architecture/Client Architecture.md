---
tags: [architecture]
---
Up: [[00 - Home]] · [[Architecture Overview]]

# Client Architecture

Everything hangs off **one global XState actor** (`uiMachine`), created once in `client/app/providers.tsx` and exposed app-wide via `client/context/GameUIContext.ts` (`useUIActorRef` to send events, `useUISelector` to read slices of state).

Key files:
- `client/app/layout.tsx` — root Server Component, metadata/fonts, renders the providers tree.
- `client/app/providers.tsx` — the client boundary: creates the `uiMachine` actor, wraps theme/cursor/scroll/device providers around it.
- `client/machines/uiMachine.ts` — **the brain of the client** (≈49KB). Manages the whole app lifecycle: `outOfGame` (landing page) ↔ `inGame` (with `lobby`, `playing`, `ability` sub-states), plus `promptToJoin` and `reconnecting`.
- `client/app/page.tsx` — landing page; "Create/Join Game" buttons toggle modals via local `useState`, everything else through `GameUIContext`.
- `client/components/modals/` — `NewGameModal`, `JoinGameModal`, `RejoinModal` (the last now doubles as the generic "Join via Link" prompt).
- `client/app/game/[gameId]/page.tsx` → `GameClient.tsx` → `<GameUI />` — the entry into the actual game screen.

Components read state via `useUISelector` (reactive slices) and write via `send()` from `useUIActorRef` — never touch the socket directly; the machine owns that boundary (see [[Network Flow]]).

If you're changing UI flow (new modal, new screen, new client-only state) this file and `GameUIContext.ts` are where that lives — the components themselves are mostly presentational.
