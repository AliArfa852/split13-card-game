---
tags: [mechanics]
---
Up: [[00 - Home]]

# Edge Cases & Special Rulings

- **Empty Draw Pile:** the Discard Pile is repurposed — its current top card stays put, everything underneath is reshuffled into a new face-down Draw Pile.
- **Impossible draw:** if a draw is required (e.g. a penalty) and *both* piles are empty, the game ends immediately and proceeds straight to [[Scoring]] with hands as they stand.
- **Ability fizzling:** if it's a locked player's turn to resolve a stacked ability ([[Special Abilities]]), it fizzles — removed from the stack, no effect.

`GAME_RULES.md` treats this as the appendix, but in practice these are the rulings most likely to matter once you start changing anything upstream of them (deck size, pile mechanics, lock conditions) — a redesign that touches [[Card Values]], [[Matching Stage]], or [[Calling Check & Round End]] should re-check all three of these still make sense.
