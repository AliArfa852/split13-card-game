---
tags: [redesign, split13]
---
Up: [[00 - Home]] · [[Redesign Ideas]]

# Split 13 — Game Rules (Draft v1)

A new 4-player, team-based capture game forked from Check!. It shares Check!'s room/lobby/authoritative-server architecture ([[Architecture Overview]]) but is a different game genre: no hidden information, no memory challenge — every player always sees their own full hand. The tension here is about *risk in the shared stack*, not imperfect self-knowledge. See [[Design Philosophy]] for how that compares to Check!'s core idea.

This is a draft: section 13 lists every place I filled a gap with a reasonable default. Read that before treating this as final — some of it needs your confirmation.

## 1. Objective

Split the deck 13 cards each between 4 players, seated as two teams of two (Team A, Team B). Capture cards off the shared table stack by matching its top card. Whichever team has captured more total points once every card has been thrown wins.

## 2. Players, Teams & Seats

Split 13 is fixed at **exactly 4 seats** — unlike Check!'s 2–6, there's no smaller or larger table.

- 1–4 humans can join a room; any seat left empty when the host starts is filled by a bot/agent player, so the table always plays full:
  - 1 human → 3 bots
  - 2 humans → 2 bots
  - 3 humans → 1 bot
  - 4 humans → 0 bots
- Seats are fixed to teams around the table: **Seat 1 & Seat 3 = Team A, Seat 2 & Seat 4 = Team B.**
- Players pick their own seat in the lobby (same room-joining mechanics as Check!) — whichever seat you take decides your team. A bot takes whatever seat is still open when the host starts.

## 3. The Deck & Card Values

Standard 52-card deck, no jokers.

| Rank | Points |
|---|---|
| Ace | 20 |
| 2–9 | 5 each |
| 10, Jack, Queen, King | 10 each |

Sanity check on the numbers: the full deck is worth exactly **400 points** (4×20 + 32×5 + 16×10). Nothing enforces an even split — a hand can end 400–0 in principle — but it's a useful number to test scoring math against.

## 4. Setup & Dealing

1. Shuffle the full 52-card deck.
2. Deal all of it: **13 cards to each of the 4 players**, nothing held back and nothing dealt face-up.
3. Each player only ever sees their own hand. Hands may be **sorted for display** (by rank/suit) — this is a client-side convenience, like arranging cards in your hand at a real table, and has no effect on dealing, turn order, or what anyone else can see.
4. The table (capture stack) starts empty.

## 5. Turn Order

- The starting seat for the hand is chosen **randomly** among the 4.
- From there, turns go **clockwise**: seat 1 → 2 → 3 → 4 → 1 → … Because seats alternate team by construction (§2), this automatically produces the A → B → A → B pattern, cycling each team's two partners in turn (e.g. A1, B1, A2, B2, A1, …).
- Each player throws exactly **one card per turn** — no exceptions.
- The hand runs for exactly 13 full circuits of the table (52 throws total — every card in the deck gets thrown exactly once over the course of the hand).

## 6. The Turn — Throwing a Card

On your turn, throw exactly one card from your hand face-up onto the table stack.

- **If the table is empty** (the very first throw of the hand, or the throw right after a capture), your card simply becomes the stack. No capture is possible on this throw.
- **Otherwise**, compare your card's **rank** to the rank of the current top card of the stack (same rank, any suit — a 7 matches any 7):
  - **Match** → you capture. See §7.
  - **No match** → your card is added on top of the stack; it becomes the new top card for whoever's turn is next. Turn passes to the next seat.

## 7. Capturing the Stack

If your card's rank matches the top card's rank:

1. Your card joins the stack.
2. You immediately capture the **entire stack** — every card that has piled up since the last capture (or since the start of the hand, if there hasn't been one yet).
3. All of it goes to **your team's** score pile (§8) — captures are shared with your partner, not kept individually.
4. The table is now empty. Your turn ends the moment you capture — you don't get a second throw. Play passes to the next seat as normal.

## 8. Scoring

- Scoring is **per team**, not per player: Team A's score is every point captured by either A1 or A2, combined. Same for Team B.
- The point value of a captured card is the table in §3, and every card in a captured stack counts, not just the one that triggered the capture.
- Scores update **live** — both teams see the total change the instant a capture happens, not just at the end of the hand.
- Because a captured card leaves the table permanently, each of the 52 cards can contribute to a team's score **at most once** per hand.

## 9. End of the Hand & Winning

- The hand ends the instant all 4 players have thrown all 13 of their cards.
- Whatever is still sitting on the table at that point was thrown but never matched by anyone — it is **discarded, worth zero points to either team.**
- Compare Team A's total to Team B's. Higher total wins the hand. In this v1 (single-hand mode, per your call), **winning the hand wins the game** — there's no match/series structure layered on top.

## 10. Bots (v1 default — see [[Redesign Ideas]] for tuning ideas)

A simple, deliberately unclever first pass, in the same spirit as Check!'s "boring but legal" timeout defaults ([[Why These Rules Work]]):

- **If the bot holds a card matching the current top of the stack**, it plays one and captures. (Which exact matching card it picks doesn't matter strategically — only one can be thrown per turn regardless.)
- **If it has no match**, it throws its **lowest point-value** card. Rationale: whatever's on the table when someone eventually captures it is at risk for both teams, so a risk-averse bot avoids being the one who adds a high-value card to a pile it can't immediately take back.
- No lookahead, no card counting, no bluffing. Flagged explicitly as a v1 baseline, not a target difficulty.

## 11. What's Different From Check!

Worth skimming if you're used to thinking in Check!'s terms:

- **No hidden-hand memory game.** You always know your own 13 cards. The entire "half-remembered hand" premise ([[Design Philosophy]], [[Core Tension]]) doesn't apply here — Split 13's tension is about *when to risk adding value to a shared pile*, not what you can or can't remember.
- **No draw pile, no special-card abilities, no locking, no Check-calling.** Section headers like [[Draw Action]], [[Special Abilities]], [[Calling Check & Round End]] have no equivalent in Split 13 as currently specified.
- **Reused as-is:** room/lobby creation, seat-claiming, host-starts-the-game, live authoritative-server state broadcast — see [[Architecture Overview]], [[Network Flow]]. The fork is a new `game-machine`-equivalent (rules) behind the same shell (rooms, sockets, redaction-free state since there's no hidden info to redact).

## 12. Still Open

See [[Open Questions]] — every place this draft filled a gap with a guess is logged there for you to confirm or change before this becomes final.
