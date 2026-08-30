---
tags: [architecture]
---
Up: [[00 - Home]] · [[Architecture Overview]]

# Network Flow

Worked example — creating a game (`docs/ARCHITECTURE.md` §3):

1. User submits `NewGameModal` on the landing page.
2. Modal calls `send({ type: 'CREATE_GAME_REQUESTED', ... })` via `GameUIContext`.
3. `uiMachine` runs its `emitCreateGame` action, producing an `EMIT_TO_SOCKET` event with payload + ack callback.
4. The provider in `app/layout.tsx` catches it and calls `socket.emit('CREATE_GAME', payload, ack)`.
5. `server/src/index.ts` creates a new game-machine actor, adds the player.
6. Server calls the ack callback directly: `{ success, gameId, playerId, gameState }`.
7. Client's ack handler sends `GAME_CREATED_SUCCESSFULLY` to the `uiMachine`.
8. `uiMachine` updates context; `NewGameModal`'s effect notices the `inGame` transition and does `router.push('/game/[gameId]')`.
9. Game page loads; the *same* persistent `uiMachine` actor is still running, now reading `gameStage: WAITING_FOR_PLAYERS` and rendering `GameLobby`.

**Socket events** (`SocketEventName` in [[Shared Types & Data Structures]]):
- Client → server (ack-based): `CREATE_GAME`, `JOIN_GAME`, `ATTEMPT_REJOIN`
- Client → server (fire-and-forget): `PLAYER_ACTION`, `SEND_CHAT_MESSAGE`
- Server → client (broadcast/push): `GAME_STATE_UPDATE`, `SERVER_LOG_ENTRY`, `INITIAL_PEEK_INFO`, `ABILITY_PEEK_RESULT`, `INITIAL_LOGS`, `ERROR_MESSAGE`, `NEW_CHAT_MESSAGE`, `SEAT_CLAIMED_ELSEWHERE`

`ABILITY_PEEK_RESULT` batches every card of one confirmed peek into a single message on purpose — per-card messages arrived out of order under jitter, so this is a case where a naive-looking design choice (batch instead of stream) is actually load-bearing.
