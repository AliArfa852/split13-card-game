---
tags: [mechanics]
---
Up: [[00 - Home]] · [[Matching Stage]]

# Hand Grid & Empty Slots

Cards sit in fixed grid positions (2 rows). Positions are part of the memory challenge, not just layout:

1. A **matched-away** card leaves its slot **empty** for the rest of the round — nothing else moves.
2. A **penalty card** fills the earliest empty slot if one exists, otherwise adds a new slot.
3. If **both** slots of a column are empty, that column closes and everything to its right shifts one step left. Cards never change rows. This is the *only* time the grid rearranges.
4. Otherwise, nothing moves a card between slots except an ability **swap** ([[Special Abilities]]). Empty slots can't be targeted, swapped into, or chosen for a drawn card.

In data terms: `Player.hand` is `(PublicCard | null)[]` — `null` is an empty slot (`shared-types/src/index.ts`). If you're redesigning the grid (different shape, different collapse rule, etc.) this is the type and the three rules above are the entire spec — there's no other hidden state governing slot layout.
