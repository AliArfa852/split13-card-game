# Split 13 — Current Task

**Updated:** 2026-08-31 · **Branch:** `feat/split-13` · **Last commit:** `fee1fe9`

Porting this repo from **Check!** (the game it was forked from) to **Split 13**. The spec is `design-vault/Redesign/Split 13 - Game Rules.md` (v2 — every open question answered). Treat that doc as the specification, the way `docs/GAME_RULES.md` was for Check!.

**One-line status:** the game engine is finished and tested; the client is mid-port and does not compile yet (126 errors, all in view components).

---

## 1. Done and committed (`fee1fe9`)

### Contract — `shared-types/src/index.ts` — COMPLETE

Rewritten around seats and teams instead of hidden hands.

- `SEAT_COUNT` (4), `CARDS_PER_PLAYER` (13), `DEFAULT_TURN_TIMER_MS` (20s)
- `GameStage` (WAITING_FOR_PLAYERS to DEALING to PLAYING to SCORING to GAMEOVER), `Team` (A/B), `BotDifficulty` (EASY/NORMAL/HARD)
- Scoring: `CARD_POINTS`, `cardsPoints`, `FULL_DECK_POINTS` (400), `teamForSeat`
- `ClientSplitGameState`, `Player`, `CaptureInfo`, `HandResult`
- `PlayerActionType` collapsed to lobby actions + `THROW_CARD` + rematch + chat
- Deleted: `TurnPhase`, `PublicCard`/`FacedownCard`, `ActiveAbility` + ability payloads, `PublicPeek/Swap/PenaltyInfo`, matching-opportunity, seal/lock flags

### Server — COMPLETE and verified

- `server/src/game-machine.ts` — written from scratch (~720 lines, replacing Check!'s 95KB engine). Deal 13x4, random starting seat, clockwise turns, throw one card, capture on rank match, full table clear, team scoring, 20s timer with random auto-throw, bot turns, draw handling, Play Again that keeps seats/teams/team wins.
- `server/src/lib/bots.ts` — new. Three tiers (rules §11).
- `server/src/lib/deck-utils.ts` — added `dealHands`, `sortHand`, `emptyRankCounts`.
- `server/src/state-redactor.ts` — rewritten and much smaller. Hides exactly one thing: an opponent's hand *contents*.
- `server/src/types.ts`, `server/src/index.ts` — ported.
- `scripts/check-split13-rules.mjs` — new, wired as `npm run check:rules`.

**Verification (passing on this machine):** 35 full hands across all three bot tiers, plus a hand where the human never acts so the timer carries all 13 of their turns. Asserts points and cards conserved (A + B + stranded = 400 / 52), exactly 52 throws, clockwise order, A-B-A-B alternation, capture always clearing the table. Redaction boundary and the scoring/tie branch tested directly.

---

## 2. Done, NOT yet committed (client port, in progress)

### Deleted — 12 Check!-only components

`AbilityMoment` · `MatchMoment` · `PenaltyMoment` · `CheckMoment` · `HandGrid` · `LearnCheckSheet` · `RoundSummary` · `ActionController` · `ActionControllerView` · `ActionFactories` · `ActionBarComponent` · `ActionButton`

They rendered mechanics Split 13 does not have. The Action* cluster existed to offer draw/swap/match/ability choices; Split 13 has one move.

### `client/machines/uiMachine.ts` — ported, 72 errors to 0 ✅

Kept the infrastructure worth keeping: cold-start handling, reconnect/rejoin, server-clock offset, the unanswered-action watchdog, session persistence.

Removed: `initialPeek` / `finalTurns` / `ability` states, `visibleCards`, `hasPassedMatch`, `currentAbilityContext`, the peek/ability actions and guards, and the nine dead turn actions. Added `THROW_CARD`, `CLAIM_SEAT`, `SET_BOT_DIFFICULTY`.

### `client/lib/actors.ts` — ported ✅ (`createGameActor` now takes `botDifficulty`, not `maxPlayers`)

---

## 3. TO DO

### 3.1 Get the client compiling — 126 errors across 12 files

Verified error counts as of this update. Work top-down; the big four are the real rebuild.

| Errors | File | Work |
|---|---|---|
| 23 | `components/game/PlayerHand.tsx` | 13-card hand, always face-up to owner, click a card to throw, enabled only on your turn |
| 23 | `components/game/GameBoard.tsx` | Rebuild: 4 seats (me bottom, partner top, opponents left/right), stack in the centre |
| 22 | `components/game/PlayerHandStrip.tsx` | Opponent seat: name, team, card count, bot badge, turn highlight |
| 18 | `components/game/TableArea.tsx` | One capture stack (not draw + discard piles) with its live point value |
| 10 | `components/game/useGameSounds.ts` | Drop peek/ability/match/penalty/check sounds; add a capture sound |
| 10 | `components/game/GameLobby.tsx` | 4 fixed seats, seat/team picker, bot-fill preview, difficulty setting; teams lock at start |
| 10 | `app/providers.tsx` | Remove the two dead socket bridges (`INITIAL_PEEK_INFO`, `ABILITY_PEEK_RESULT`) and their `socket.off` cleanups; drop `AbilityPeekResultPayload`; rename `ClientCheckGameState` to `ClientSplitGameState` |
| 4 | `components/game/GameEventCaption.tsx` | New event vocabulary (throw / capture) |
| 3 | `components/layout/SidePanel.tsx` | Log/chat panel — same vocabulary update |
| 1 | `lib/types.ts` | Delete `isDrawnCard` (no drawn card in Split 13) |
| 1 | `components/modals/NewGameModal.tsx` | Replace the 2-6 player picker with the bot-difficulty room setting |
| 1 | `components/cards/VisualCardStack.tsx` | Generalise to one growing capture stack |

Live list any time:

```
npx tsc --noEmit -p client/tsconfig.json
```

### 3.2 New components Split 13 needs (none exist yet)

- Seat/team picker for the lobby (locks once the host starts)
- Team scoreboard — live A vs B
- Live table-stack value indicator (rules §9 — the number the whole risk decision turns on)
- 20s turn-timer countdown, visible to everyone, not just the active player
- Bot indicator on a seat, and the bot-difficulty room-setting control
- `--team-a` / `--team-b` colour tokens in `app/globals.css` (light + dark + the `@theme` mapping)

### 3.3 Then

- Landing page (`app/page.tsx`) and rules page (`app/rules/`) still carry Check!'s copy and illustrations — they compile, so they are last
- Delete or rewrite the obsolete `scripts/check-*.mjs` (hidden cards, penalty placement, short peek, series totals) — they assert mechanics that no longer exist
- Port `server/.env.example` (still documents Check!'s knobs; Split 13 reads `TURN_TIMER_MS`, `BOT_THINK_MS`)
- **Run it end to end:** `npm run dev`, play a hand against three bots, confirm captures / scores / timer match the rules doc
- Update the five `.visualmd` files and commit

---

## 4. Open decisions

1. **13-card hand layout** — fanned/overlapping (looks like real cards, tighter on mobile) or a flat scrollable row (easier to hit accurately on a phone)? Drives most of `PlayerHand` and `GameBoard`. **Not yet answered — blocks 3.1's big four.**
2. **Bot difficulty granularity** — currently one room-wide setting. Should the host be able to set it per bot seat? (Also logged in `design-vault/Redesign/Open Questions.md`.)

---

## 5. Environment notes (save time later)

- **`npm ci` is done** on this machine. It took several attempts because the build's `rimraf` clean step needs file-delete permission, which is granted per session.
- **Delete permission is per session.** If `rm` fails with "Operation not permitted", it needs granting again before builds will work.
- **Remote commands cap at ~180s and each runs in a fresh sandbox**, so background processes do not survive between calls. Long installs must be run directly, or the work moved into the cloud container.
- **Container fallback:** copying `shared-types/` + `server/` sources into the cloud container and running `npm install` + `tsc` there is much faster for headless verification. It cannot verify UI.
- **`npm run check:rules` sets its own fast pacing** (`TURN_TIMER_MS=300`, `BOT_THINK_MS=1`) before importing the machine. Without that it inherits the real 20s timer and one run takes ~33 minutes.
- **`npm run verify:server`** is the gate while the client is being ported; full `npm run verify` runs the client build and cannot pass yet.

---

## 6. Invariants — do not break these

- `resolveThrow` in `game-machine.ts` is the entire turn, as one pure function. Three paths reach it (human action, bot decision, timer expiry) and they must produce identical outcomes. Never add a fourth path with its own capture logic.
- A seat is **never** left empty once the table is locked — a leaver is replaced by a bot. An unheld seat is a turn nobody can take, and the hand stalls on its timer forever.
- Seat parity **is** the team (`teamForSeat`: even = A, odd = B). Clockwise play over alternating seats produces A-B-A-B with no special-casing. Do not add separate turn-order state.
- `state-redactor.ts` is still the security boundary. Everything else is public by design; if a new feature adds private information, it must be redacted there.
