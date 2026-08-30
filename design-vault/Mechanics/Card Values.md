---
tags: [mechanics]
---
Up: [[00 - Home]]

# Card Values

Standard 52-card deck, no Jokers.

| Rank | Value |
|---|---|
| Ace | **-1** |
| 2–10 | face value |
| Jack | 11 |
| Queen | 12 |
| King | 13 |

Ace being negative is the one card worth actively fishing for — it's the only way to pull your total below zero. J/Q/K are both the most expensive cards to be caught holding *and* the only cards with abilities (see [[Special Abilities]]), so they're a constant risk/reward trade-off: powerful when you play them, costly if you're stuck holding one at [[Scoring]].

`CardRank` enum in `shared-types/src/index.ts`: `Ace, Two..Nine, Ten (T), Jack, Queen, King`. Value math itself lives in the server (`server/src/game-machine.ts`), not in shared-types — worth grepping for if you change the value table.
