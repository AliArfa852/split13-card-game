---
tags: [mechanics]
---
Up: [[00 - Home]]

# Calling "Check" & Round End

## Player-initiated
On your turn, if nothing else is pending and Final Turns hasn't started, you may **Call Check**: your turn ends immediately, you become the official **Check-caller**, you're now **locked** (no more actions this round), and the game enters **Final Turns**.

## Automatic (empty hand)
Emptying your hand via a successful match auto-triggers Check. You're locked immediately; if it's the *first* Check of the round you become the official caller and Final Turns begins.

## Final Turns Phase
Every other eligible player gets exactly **one** more turn — normal rules apply, including [[Matching Stage]] and [[Special Abilities]].
- Turn order continues clockwise from wherever play actually was (the seat after whoever was mid-turn), **not** from the checker's seat — this matters specifically when Check triggers automatically out-of-turn.
- No one can manually Call Check during this phase.

## Locked player state
Once locked (by calling Check, emptying a hand, or being disqualified — see [[Matching Stage]]), a player's cards **cannot be targeted** by anyone's ability.

`PlayerStatus` enum: `WAITING, PLAYING, CALLED_CHECK, DISQUALIFIED, WINNER, LOSER`. `GameStage` enum: `WAITING_FOR_PLAYERS, DEALING, INITIAL_PEEK, PLAYING, FINAL_TURNS, SCORING, GAMEOVER` — both in `shared-types/src/index.ts`.

Next: [[Scoring]].
