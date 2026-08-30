---
tags: [design]
---
Up: [[00 - Home]] · [[Design Philosophy]]

# Why These Rules Work (and where they might not survive changes)

A few mechanics that look arbitrary until you see what they're protecting — worth reading before you cut or change them.

**Empty slots don't get refilled by shifting cards ([[Hand Grid & Empty Slots]]).** If cards slid over to fill gaps, every match would silently invalidate everyone's memory of *unrelated* cards. Keeping slots empty (with one narrow column-collapse exception) means the only information you lose is about the card that actually left.

**Matched cards are locked forever, not just while the pile is sealed ([[Matching Stage]]).** The temporary seal stops immediate re-drawing; the permanent lock stops a card that's already had two copies see-sawed onto the discard pile from re-entering circulation as a source of *new* certainty ("I know that discard-pile card is a 7, because I saw it get matched"). Removing the permanent lock would make the discard pile a slowly-growing pool of known information, which cuts against the "only ever partially certain" premise in [[Design Philosophy]].

**Special-card abilities don't fire on draw, only on discard ([[Draw Action]], [[Special Abilities]]).** This is what makes holding a King a live decision rather than an automatic trigger — you choose when (and whether) to cash in the ability, and until then it's just 13 dead points sitting in your hand.

**Auto-actions on timeout are the "safe" choice, not the "smart" choice ([[Turn Timers]]).** Auto-draw-from-deck, auto-discard-the-drawn-card, auto-swap-into-slot-0 — none of these try to play well, they just guarantee the game can't stall. If you add new timed decisions, matching that pattern (a boring-but-legal default) keeps stalling from ever becoming a strategy.

If you're planning to change any of these four, it's worth writing down in [[House Rules Draft]] *what replaces the property it was protecting*, not just what the new rule says.
