# Split 13 — Current Task

**Updated:** 2026-08-31 (session 2) · **Branch:** `feat/split-13`

Porting this repo from **Check!** (the game it was forked from) to **Split 13**. The spec is `design-vault/Redesign/Split 13 - Game Rules.md` (v2 — every open question answered). Treat that doc as the specification, the way `docs/GAME_RULES.md` was for Check!.

**One-line status:** engine finished and tested; **client now compiles clean (126 errors → 0) and lints clean**. Not yet seen running in a browser — see §3.1.

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
- `server/src/state-redactor.ts` — rewritten and much smaller. Hides exactly one thing: an opponent's hand _contents_.
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

### 3.1 Run it and look at it ⚠️ THE NEXT STEP

Everything compiles, but **no one has seen the board yet**. This needs you, because it cannot be done from this session (see §5):

```
npm run dev
```

Then open http://localhost:3000, create a table, and start solo against three bots.

What to check against the rules doc:

- Cards deal 13 to you, three bot seats fill, teams read as A (seats 1 & 3) and B (seats 2 & 4)
- Your hand is face-up to you and sorted; opponents show a card count only
- Tap a card to select, tap again to throw; a card that would capture is ringed
- The stack grows, shows its live point value, and is swept whole on a capture
- The 20s timer runs for whoever is on the clock; letting it expire throws a random card for you
- Team scores update live; the hand ends after 52 throws with a result overlay

**Known environment issue:** `app/layout.tsx` fetches Nunito Sans from Google Fonts at build time. `npm run dev` degrades to a fallback font if that is unreachable; `npm run build` hard-fails. Fine on a normal connection. If you want it network-independent, the repo already ships the TTFs — but only weights 400 and 800, and the UI uses `font-semibold` (57×) and `font-bold` (34×), which would both snap to 800 and flatten the type hierarchy. Left as-is deliberately; your call.

### 3.2 Rebrand pass (compiles today, still says Check!)

- `app/page.tsx` — landing copy and illustrations
- `app/rules/` — still Check!'s rules; Split 13's are in `design-vault/Redesign/Split 13 - Game Rules.md`
- `GameHeader.tsx` wordmark · `BrandMark.tsx` · `Signature.tsx` · `public/signature.svg` · `lib/site.ts`
- Icons and share card: `app/manifest.ts`, `apple-icon.tsx`, `icon.svg`, `icon-512/`, `maskable-icon/`, `opengraph-image.tsx`
- `client/package.json` name/description

### 3.3 Cleanup

- Delete or rewrite the obsolete `scripts/check-*.mjs` (hidden cards, penalty placement, short peek, series totals) — they assert mechanics that no longer exist
- `lib/sounds.ts` still declares 7 sprites for cut mechanics (peek/ability/penalty/check/swap/draw/skip) and their mp3s are still in `public/sounds/`
- Port `server/.env.example` (still Check!'s knobs; Split 13 reads `TURN_TIMER_MS`, `BOT_THINK_MS`)
- `tools/probe/` still drives Check!'s flow — rebuild against Split 13's, or drop it

## 4. Open decisions

1. ~~13-card hand layout~~ — **decided: overlapping fan.** Thirteen cards do not fit side by side on a phone, and the overlap is set so each card's rank corner stays visible, which is the only part that matters in a matching game. Easy to swap for a flat scrollable row: it is one `-ml-*` class in `PlayerHand.tsx`.
2. **Google Fonts dependency** — see §3.1. Keep the variable font (needs network at build time) or self-host the two local weights (flattens semibold/bold into extrabold)?
3. **Bot difficulty granularity** — currently one room-wide setting. Should the host be able to set it per bot seat? (Also logged in `design-vault/Redesign/Open Questions.md`.)

---

## 5. Environment notes (save time later)

- **`npm ci` is done** on this machine. It took several attempts because the build's `rimraf` clean step needs file-delete permission, which is granted per session.
- **Delete permission is per session.** If `rm` fails with "Operation not permitted", it needs granting again before builds will work.
- **Remote commands cap at ~180s and each runs in a fresh sandbox**, so background processes do not survive between calls. Long installs must be run directly, or the work moved into the cloud container.
- **Container fallback:** copying `shared-types/` + `server/` sources into the cloud container and running `npm install` + `tsc` there is much faster for headless verification. It cannot verify UI.
- **`npm run check:rules` sets its own fast pacing** (`TURN_TIMER_MS=300`, `BOT_THINK_MS=1`) before importing the machine. Without that it inherits the real 20s timer and one run takes ~33 minutes.
- **`npm run verify:server`** passes. Full `npm run verify` still cannot complete here because the client production build needs Google Fonts.
- **The client cannot be run from this session.** Each remote command is a fresh sandbox capped at ~180s, so a dev server dies with the call that started it; and this sandbox cannot reach fonts.googleapis.com, which alone eats the budget in retries. Next dev also needs ~75s just to boot against the OneDrive-mounted path. Running it is a job for your machine.

---

## 6. Invariants — do not break these

- `resolveThrow` in `game-machine.ts` is the entire turn, as one pure function. Three paths reach it (human action, bot decision, timer expiry) and they must produce identical outcomes. Never add a fourth path with its own capture logic.
- A seat is **never** left empty once the table is locked — a leaver is replaced by a bot. An unheld seat is a turn nobody can take, and the hand stalls on its timer forever.
- Seat parity **is** the team (`teamForSeat`: even = A, odd = B). Clockwise play over alternating seats produces A-B-A-B with no special-casing. Do not add separate turn-order state.
- `state-redactor.ts` is still the security boundary. Everything else is public by design; if a new feature adds private information, it must be redacted there.
