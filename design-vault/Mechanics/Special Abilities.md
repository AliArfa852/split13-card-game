---
tags: [mechanics]
---
Up: [[00 - Home]] · [[Turn Structure]]

# Special Abilities

Triggered when a King, Queen or Jack lands face-up on top of the Discard Pile — from a normal discard or from a successful [[Matching Stage]] match.

| Card | Peek | Swap |
|---|---|---|
| King (K) | up to 2 cards, any players | 1 card ↔ 1 card, any players |
| Queen (Q) | up to 1 card | 1 card ↔ 1 card |
| Jack (J) | none | 1 card ↔ 1 card |

Peek/swap counts are **maximums, not requirements** — you can peek fewer than allowed and still confirm, and you can skip peek and/or swap entirely (skipping swap ends the ability). This matters for pooled abilities below.

**Peek visibility rule (real-table parity):** everyone sees *which positions* are being peeked at; only the peeking player sees the *faces*. Same idea for a card lifted off the Discard Pile — it's face-up for everyone, since it was already public. This shows up verbatim in code comments (`shared-types/src/index.ts`, `PublicPeekInfo`/`PublicSwapInfo`) — see [[Design Philosophy]].

## LIFO stack (matched special cards)
Match a King onto a King (etc.) and you get **two** abilities on a stack, resolved **last-in-first-out**: the matcher's ability resolves before the original discarder's.

## Pooling
If the *same* player ends up owed two abilities of the same shape (e.g. two Kings), the code pools them: peeks sum (2+2=4) and are all taken before any swap; swaps likewise stack. See `ActiveAbility.remainingPeeks` / `remainingSwaps` in `shared-types/src/index.ts` — this is model/engine detail with no separate section in `GAME_RULES.md`, so treat the code as the source of truth if you touch it.

## Fizzling
If it's a locked player's turn to resolve a stacked ability, it fizzles with no effect (see [[Edge Cases]]). Locked players' cards also can't be targeted by anyone else's ability — see [[Calling Check & Round End]].

Related types: `AbilityType = "peek" | "swap" | "king"`, `ActiveAbility`, `PeekAbilityPayload`/`SwapAbilityPayload`/`SkipAbilityPayload` in `shared-types/src/index.ts`.
