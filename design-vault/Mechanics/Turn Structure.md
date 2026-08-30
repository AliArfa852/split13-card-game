---
tags: [mechanics]
---
Up: [[00 - Home]]

# Turn Structure

Turns go clockwise. A turn = one mandatory **Draw Action**, then a discard, then the **Matching Stage**, then (if triggered) **Special Abilities**. The turn only passes once all of that resolves.

```
DRAW  →  DISCARD  →  MATCHING  →  (ABILITY)  →  next player
```

This is literally the `TurnPhase` enum in `shared-types/src/index.ts`: `DRAW, DISCARD, MATCHING, ACTION, ABILITY`. (`ACTION` covers the special-cards-drawn-from-discard-must-swap step.)

Breakdown:
- [[Draw Action]] — the two ways to draw, and what you can do with what you drew.
- [[Matching Stage]] — the real-time window after every discard.
- [[Special Abilities]] — triggered by K/Q/J hitting the discard pile.
- [[Turn Timers]] — every one of the above windows is clocked.

A full turn can therefore touch every other player's hand before it's even the next person's turn — that's the source of most of the game's tension and most of its bugs (see [[Edge Cases]]).
