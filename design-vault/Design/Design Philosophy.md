---
tags: [design]
---
Up: [[00 - Home]]

# Design Philosophy

This note is analysis, not a quote from the original author — it's what the rules and code *imply* about intent, useful as a checklist when you start changing things in [[Redesign Ideas]].

**"Your hand changes while you're only half sure what's in it."** (README's own framing.) Every other mechanic seems to serve that one sentence:
- You only ever get one guaranteed look at your hand — 2 of 4 cards, once, at the start ([[Setup & Dealing]]). Everything after that is inference and decay: opponents' swaps and your own memory both degrade over a round.
- Grid slots never move except by an explicit rule ([[Hand Grid & Empty Slots]]) — so "where a card is" stays meaningful information worth tracking, rather than being scrambled by implementation convenience.
- Special-card abilities ([[Special Abilities]]) are the only way to *refresh* your knowledge mid-round (peek) or actively sabotage someone else's (swap) — and they're gated behind holding and discarding a K/Q/J, which are also the three worst cards to be caught holding at [[Scoring]]. That's a deliberate-looking tension: the cards that help you see are also the cards most expensive to keep.

**"Real-life table parity."** This phrase is literally in the code (`shared-types/src/index.ts`, comments on `PublicPeekInfo`/`PublicSwapInfo`/`PublicPenaltyInfo`): the rule is consistently *everyone sees that an action happened and roughly where, nobody but the actor sees the card face*. That's a strong, reusable design principle if you're adding new abilities or actions — ask "what would be visible to someone standing at a real table?" and redact accordingly. See [[Why These Rules Work]].

**Timers everywhere, but short ones only where speed matters.** Draw/discard/ability windows are all 45s (deliberation is fine), but the [[Matching Stage]] window is ~5s — that's the one moment where speed *is* the mechanic (first correct card wins), so its timer is an order of magnitude shorter. If you add a new timed window, decide first whether it's a deliberation window or a race, and size the timer accordingly.

See also: [[Core Tension]], [[Why These Rules Work]].
