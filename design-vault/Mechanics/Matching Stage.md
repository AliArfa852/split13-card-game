---
tags: [mechanics]
---
Up: [[00 - Home]] · [[Turn Structure]]

# Matching Stage

Fires immediately after **any** card lands face-up on the Discard Pile — during a normal turn or as a side effect of a previous match.

- **Objective:** discard a card of the exact same rank from your own hand onto it.
- **Who can try:** any player who is not locked, *including* the player who just discarded.
- **Timer:** short (~5s default) — see [[Turn Timers]].
- **Passing is final** for that one opportunity; you can't come back in after passing.
- **Stage ends** on: a successful match, everyone eligible passing, or timeout (timeout = auto-pass for anyone who hasn't acted).

## Successful match
- First correct-rank card played wins. It's removed from that player's hand (grid slot goes **empty**, see [[Hand Grid & Empty Slots]] — nothing shifts).
- Discard pile becomes **sealed**: undrawable until the next player's turn starts (or something else unseals it).
- Both the original discarded card and the matching card become **permanently locked** — undrawable from the pile for the rest of the round, even after the seal lifts. (Sealed = temporary blanket block; locked = these two specific cards, forever.)
- Two special cards matched onto each other → both abilities fire, LIFO — see [[Special Abilities]].
- Hand hits zero cards → automatic Check, see [[Calling Check & Round End]].

## Failed match (penalty)
- Wrong-rank attempt: the card returns to your hand, and you must immediately draw one penalty card from the Draw Pile.
- The stage **keeps going** for everyone else (and you can try again if you have another candidate).
- Penalty card takes your hand to **8 cards** → you're **disqualified**: locked, out of turns/matches/abilities for the round, hand still revealed and scored, but you can't win. If disqualifications drop active players below 2 and no Check is in progress, the round ends immediately → [[Scoring]].

This stage is the main source of *shared* information: everyone watches who tries, who fails, who takes a penalty. It's also why matching is a bluffing tool as much as a memory test — see [[Design Philosophy]].
