---
tags: [mechanics]
---
Up: [[00 - Home]]

# Setup & Dealing

1. Players join a lobby (`GameStage.WAITING_FOR_PLAYERS`). The Game Master starts the game; the lobby locks the instant it does — no late joiners.
2. Deck is shuffled, each player dealt 4 cards face-down in a 2×2 grid (`GameStage.DEALING`).
3. **Initial Peek** (`GameStage.INITIAL_PEEK`): each player secretly looks at their **bottom two cards only** (row 2 of the grid), then everything goes face-down again.
4. If a player never declares Ready, the peek phase starts anyway once its timer expires — see [[Turn Timers]].

Why bottom-two-only matters: it guarantees every player starts with *exactly the same amount* of certain knowledge (2 of 4 cards) but never full knowledge, so the memory game begins asymmetric only in what happens after, not in the deal itself. See [[Design Philosophy]].

Related types: `GameStage` enum in `shared-types/src/index.ts`.
