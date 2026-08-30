---
tags: [mechanics]
---
Up: [[00 - Home]] · [[Turn Structure]]

# Turn Timers

Every decision window is clocked so one player can't stall the table:

| Window | Default | On timeout |
|---|---|---|
| Draw | 45s | auto-draws from the Draw Pile |
| Discard | 45s | unresolved deck-draw auto-discards; unresolved discard-pile-draw auto-swaps into hand slot 0 |
| Matching | ~5s | counts as a Pass for anyone who hasn't acted |
| Ability | 45s | unresolved ability fizzles, see [[Edge Cases]] |
| Initial Peek | — | begins anyway even if a player never declares Ready |

Timer length is server-authoritative (`turnDeadline`, `turnTimerMs`, `matchingOpportunity.durationMs` in `ClientCheckGameState`) — the client animates a countdown against these values rather than hardcoding its own, so the bar can never drift from what the server will actually enforce. `.env.example` in `client/` and `server/` is where the real defaults live if you want to change pacing.
