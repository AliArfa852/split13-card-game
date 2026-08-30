---
tags: [architecture]
---
Up: [[00 - Home]] · [[Architecture Overview]]

# State Management Strategy

**Server (authoritative):** `game-machine.ts`'s context holds the complete, unredacted state. It's a pure function: events in, new state + a list of side effects to emit out. See [[Server Architecture]].

**Client (view state):** one global `uiMachine`, provided at the app root, is the single source of truth for the *client's* view of everything — not just game state but modals, connection status, ability-selection UI, etc. See [[Client Architecture]].

**Interaction model:**
- Components read via `useUISelector` (subscribe to a slice).
- Components write via `send()` from `useUIActorRef` (typed events into the machine).
- The machine turns a user action into an `EMIT_TO_SOCKET` event, which the provider in the root layout actually puts on the wire.

Nothing in a component ever touches `socket` directly — that boundary is the machine's job. If you're adding a new player action, the shape is: new event on `uiMachine` → `EMIT_TO_SOCKET` → new `PlayerActionType` in [[Shared Types & Data Structures]] → handled in `game-machine.ts`.
