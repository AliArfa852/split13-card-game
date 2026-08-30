---
tags: [architecture]
---
Up: [[00 - Home]] · [[Architecture Overview]]

# Server Architecture

- `server/src/index.ts` — Socket.IO server, connection lifecycle, the `activeGameMachines` map of live game actors, ack-based request/response for `CREATE_GAME`/`JOIN_GAME`/`ATTEMPT_REJOIN`, and broadcast on every actor emit (`BROADCAST_GAME_STATE`, `BROADCAST_CHAT_MESSAGE`).
- `server/src/game-machine.ts` — **the definitive source of truth for the rules** (≈95KB). A pure XState machine, configured via input, that communicates results by emitting events rather than mutating anything directly. This is where every rule in [[Game Overview]] and its children is actually enforced — `GAME_RULES.md` is the spec, this file is the implementation, and per `CONTRIBUTING.md` the rules doc wins if they ever disagree.
- `server/src/state-redactor.ts` — `generatePlayerView`: strips hidden info (opponent hands, private logs) before a state broadcast reaches any one client.

> [!warning] Security-sensitive
> Per `CONTRIBUTING.md`: no face-down card's rank or suit should ever reach a client outside `SCORING`/`GAMEOVER` — **including the card's own owner**. `state-redactor.ts` has leaked a player's own hand once before. If a redesign adds a new way to see cards (a new ability, a new UI affordance), this is the file to re-audit.

Server changes aren't visible on a PR preview (Vercel only builds the client) — see [[Deployment]] and [[Testing Strategy]] for how verification actually works here.
