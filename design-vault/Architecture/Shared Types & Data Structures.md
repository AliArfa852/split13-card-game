---
tags: [architecture]
---
Up: [[00 - Home]] · [[Architecture Overview]]

# Shared Types & Data Structures

`shared-types/src/index.ts` is the one contract both client and server compile against. If you're redesigning mechanics, this file is usually the *first* thing to change, because everything downstream (server logic, redaction, client rendering) is typed against it.

**Core enums:**
- `GameStage`: `WAITING_FOR_PLAYERS, DEALING, INITIAL_PEEK, PLAYING, FINAL_TURNS, SCORING, GAMEOVER`
- `TurnPhase`: `DRAW, DISCARD, MATCHING, ACTION, ABILITY`
- `PlayerStatus`: `WAITING, PLAYING, CALLED_CHECK, DISQUALIFIED, WINNER, LOSER`
- `PlayerActionType`: lobby actions (`START_GAME`, `DECLARE_LOBBY_READY/UNREADY`, `LEAVE_GAME`, `REMOVE_PLAYER`), turn actions (`DRAW_FROM_DECK`, `DRAW_FROM_DISCARD`, `SWAP_AND_DISCARD`, `DISCARD_DRAWN_CARD`), matching (`ATTEMPT_MATCH`, `PASS_ON_MATCH_ATTEMPT`), game actions (`CALL_CHECK`, `DECLARE_READY_FOR_PEEK`, `PLAY_AGAIN`, `REQUEST_PLAY_AGAIN`), ability (`USE_ABILITY`), misc (`SEND_CHAT_MESSAGE`)

**Core shapes:**
- `Card { id, suit, rank }` / `FacedownCard { id, facedown: true }` / `PublicCard = Card | FacedownCard`
- `Player` — the *redacted* view another client sees: `hand: (PublicCard | null)[]` (`null` = empty grid slot, see [[Hand Grid & Empty Slots]]), status, ready/dealer/locked/connected flags, score, `pendingDrawnCard`.
- `ClientCheckGameState` — the whole redacted state a client renders from: players, deck/discard sizes, turn order/phase, `abilityStack`, `matchingOpportunity`, `checkDetails`, `gameover`, `playerWins`/`playerTotals` (cross-round), `log`/`chat`, seal/lock flags, `publicPeek`/`publicSwap`/`publicPenalty` (position-only, see [[Special Abilities]]), `turnDeadline`/`turnTimerMs`, `serverNow` (clients derive a clock offset from this instead of trusting local `Date.now()`).
- `ActiveAbility { type, stage, playerId, sourceCard, remainingPeeks?, remainingSwaps? }` — see pooling note in [[Special Abilities]].

**Wire contract:** `SocketEventName` enum + `ServerToClientEvents`/`ClientToServerEvents` interfaces — see [[Network Flow]].

Comment-level design notes worth knowing about (they explain *why* a field looks the way it does, not just what it is):
- `discardPile` only ships the visible top ~2 cards, not the whole pile — "broadcasting the whole pile grew every payload by the length of the game."
- `PublicPeekInfo`/`PublicSwapInfo`/`PublicPenaltyInfo` exist specifically for "real-life table parity": everyone sees *that* something happened and *where*, never the card face. See [[Design Philosophy]].
