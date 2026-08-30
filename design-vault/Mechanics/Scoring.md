---
tags: [mechanics]
---
Up: [[00 - Home]] · [[Calling Check & Round End]]

# Scoring

After Final Turns completes, all hands reveal. Totals use [[Card Values]]. Lowest total wins (ties all win). Disqualified players are revealed and scored but can't win.

Scores **do not carry between rounds** — but the lobby does track cumulative stats across rounds for as long as it lasts:
- `playerWins` — cumulative round wins per player.
- `playerTotals` — cumulative round *scores* per player (lower is better); used only to break ties in standing, never resets a round's own score.
- Both reset only when the lobby itself ends, not between rounds; `roundEpoch` bumps on each Play Again so clients know to drop old log/chat instead of merging.

No fixed number of rounds, no target score — the host can just keep starting new rounds (`PLAY_AGAIN`), and non-hosts can signal interest via `REQUEST_PLAY_AGAIN` (advisory `rematchVotes` tally; only the host's `PLAY_AGAIN` actually starts the next round).

`gameover` object shape: `{ winnerIds: PlayerId[], loserId: PlayerId | null, playerScores: Record<PlayerId, number> }` (`shared-types/src/index.ts`).
