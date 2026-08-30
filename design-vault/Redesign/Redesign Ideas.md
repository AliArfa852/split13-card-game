---
tags: [redesign]
---
Up: [[00 - Home]]

# Redesign Ideas

Scratchpad. Add one entry per idea — doesn't need to be polished, this is where half-formed stuff lives before it's promoted to [[House Rules Draft]].

## Template
```
### <idea name>
- What changes: 
- Why (what problem does this solve, or what does it make more interesting):
- What it touches: [[Card Values]] / [[Matching Stage]] / [[Special Abilities]] / [[Hand Grid & Empty Slots]] / [[Calling Check & Round End]] / [[Scoring]] / other
- Risk / what it might break (check against [[Why These Rules Work]] and [[Core Tension]]):
- Status: idea / testing / decided / rejected
```

## Prompts to fill in when you're ready
- **Rules changes** — anything in `docs/GAME_RULES.md` you'd write differently.
- **New mechanics** — things Check! doesn't have at all.
- **Removed mechanics** — things you'd cut, and what (if anything) fills the gap.
- **Player count / pacing** — does your version want to feel different at 2 players vs 6?
- **Theme / reskin** — new name, new card meanings, new visual identity (independent of rules).
- **Tech changes** — anything in [[Architecture Overview]] you'd rebuild rather than fork (e.g. add the missing test suite from [[Testing Strategy]] before changing rules on top of it).

---

## Log

- **2026-08-30 — Split 13.** Promoted from an idea straight to a full draft spec: [[Split 13 - Game Rules]]. 4-player, 2v2 team capture game — split the deck 13 each, throw one card a turn, match the top of the stack to sweep it, highest team total wins. Open decisions tracked in [[Open Questions]].
- **2026-08-30 — Split 13 v2.** All six v1 open questions confirmed: teams lock at room start (not re-forming per hand), table clears fully on every capture, capturing ends the turn, ties are a draw, turns get a 20s timer with random auto-throw on expiry (timer + both team scores + live stack value all shown to everyone), and bot difficulty (easy/normal/hard) becomes a room setting. [[Split 13 - Game Rules]] updated to v2 with all of it folded in.
