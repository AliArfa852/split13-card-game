# Architecture

How Split 13 is put together: the main components, what each is responsible
for, and how they interact. The rules the server enforces are specified
separately in [GAME_RULES.md](./GAME_RULES.md).

## 1. Core philosophy

- **Authoritative server.** One XState machine holds the game. Every action is
  validated server-side, so a modified client cannot change the outcome of a
  hand.
- **One private thing.** Unlike a memory game, almost everything here is
  public: you see your own thirteen cards, and every card in the table stack
  was thrown face-up in front of everyone. Exactly one thing is secret — the
  _contents_ of another player's hand — and `state-redactor.ts` is the single
  place that keeps it that way.
- **Global, persistent client state.** One XState actor at the root of the
  React tree covers the whole session: landing page, lobby, table,
  disconnection and reconnection.

## 2. Packages

A monorepo of three npm workspaces.

### `shared-types/`

The single TypeScript contract both halves compile against. Anything crossing
the wire starts here. It also owns the numbers the rules are made of —
`SEAT_COUNT`, `CARDS_PER_PLAYER`, `CARD_POINTS`, `teamForSeat` — so the client
cannot disagree with the server about what a King is worth or which seats are
Team A.

### `server/`

Node, Socket.IO, XState.

- `src/index.ts` — the Socket.IO server. Connections, rooms, lobby codes,
  reconnect tokens, the `activeGameMachines` map, and an abandoned-game sweep.
  It screens the _shape_ of an incoming action before forwarding it, so a
  malformed payload is a rejected message rather than a dead game.
- `src/game-machine.ts` — the rules. A pure machine, configured by input,
  communicating results by emitting events.
- `src/state-redactor.ts` — `generatePlayerView`, the boundary described above.
- `src/lib/bots.ts` — the three bot tiers.
- `src/lib/deck-utils.ts`, `src/lib/rng.ts` — deck, deal, and a seeded random
  source that makes a whole hand reproducible from one number.

### `client/`

Next.js (App Router), TypeScript, XState, Tailwind, Framer Motion.

- `app/providers.tsx` — creates the global `uiMachine` actor and bridges it to
  the socket.
- `machines/uiMachine.ts` — the client's brain: `outOfGame` and `inGame`, plus
  the states that make a flaky connection survivable (`reconnecting`,
  `disconnected`, `promptToJoin`, `seatClaimedElsewhere`).
- `context/GameUIContext.ts` — the typed hooks (`useUIActorRef`,
  `useUISelector`) every component uses.
- `components/game/` — the table: `GameBoard`, `PlayerHand`, `PlayerSeat`,
  `TableArea`, `TeamScoreboard`, `TurnTimer`, `GameLobby`.

## 3. One turn, end to end

1. You tap a card twice in `PlayerHand`; `GameBoard` sends `THROW_CARD` into
   the `uiMachine`.
2. The machine emits `EMIT_TO_SOCKET`; the bridge in `providers.tsx` puts it
   on the wire. Components never touch the socket themselves.
3. `server/src/index.ts` checks the payload shape and forwards it to that
   game's machine.
4. The machine's `resolveThrow` applies the whole turn: the card leaves your
   hand and either captures the stack (its rank matches the top card) or
   becomes the new top. Either way the seat advances.
5. The machine emits `BROADCAST_GAME_STATE`; the server redacts a view per
   player and sends it.
6. Every client applies the update and re-renders the slices that changed.

Three different things can throw a card — you, a bot, or the turn timer
expiring — and all three call `resolveThrow`. That is deliberate: it is the
only way the three paths cannot drift apart.

## 4. Rules invariants worth knowing before you change anything

- **A seat is never empty once the table is locked.** A leaver is replaced by a
  bot, because an unheld seat is a turn nobody can take and the hand would
  stall on its timer forever.
- **Seat parity is the team.** Even seats are Team A, odd are Team B, so plain
  clockwise play produces the A→B→A→B order with no special-casing. There is
  no separate turn-order state to keep in sync.
- **Timeouts are boring but legal.** An expired turn throws a random card
  rather than skipping, so stalling is never a strategy and the hand always
  ends after exactly 52 throws.

## 5. Testing

`npm run check:rules` drives whole hands through the real machine and asserts
what the rules promise: points and cards conserved (both teams plus whatever
is stranded must come to 400 and 52), exactly 52 throws, clockwise order,
teams alternating, a capture always clearing the table, a stalling player
carried by the timer, the redaction boundary, the scoring and tie branches,
and that a malformed action cannot kill a game.

It runs a full sweep of hands across all three bot tiers, using the seeded RNG
so a failure is reproducible. `npm run verify:server` is the whole server gate;
`npm run verify` adds lint, formatting and the client build.

There is no component or browser test layer. Check!'s layout probe in
`tools/probe/` still drives _its_ flow and has not been ported.

## 6. Where the two halves run

The client and server deploy separately from `main`: client to Vercel, server
to Render, with no staging between them. They are joined only at runtime by
URL — the client reads `NEXT_PUBLIC_WEBSOCKET_URL` (`client/lib/socket.ts`),
falling back to `http://localhost:8000`, which is what `npm run dev` serves.

Two consequences worth remembering:

- A pull request preview cannot test a server change. Vercel builds the client
  only, and that preview talks to whatever server is already running.
- Do not add an `engines` field or an `.nvmrc`. Both platforms read them, and
  adding one silently changes the Node version the live deployment builds with.
