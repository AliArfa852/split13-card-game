import {
  Card,
  CardRank,
  Suit,
  SEAT_COUNT,
  CARDS_PER_PLAYER,
} from "shared-types";
import { type Rng, systemRng } from "./rng.js";

export const createDeck = (rng: Rng = systemRng): Card[] => {
  const suits = Object.values(Suit);
  const ranks = Object.values(CardRank);
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ id: rng.id(), suit, rank });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[], rng: Rng = systemRng): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.float() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

/** Display order for a hand. Rank first, so identical ranks sit next to each
 *  other: this is a matching game, and holding two 7s together is the thing a
 *  player most needs to see at a glance. Suit only breaks ties. */
const RANK_ORDER: CardRank[] = [
  CardRank.Ace,
  CardRank.Two,
  CardRank.Three,
  CardRank.Four,
  CardRank.Five,
  CardRank.Six,
  CardRank.Seven,
  CardRank.Eight,
  CardRank.Nine,
  CardRank.Ten,
  CardRank.Jack,
  CardRank.Queen,
  CardRank.King,
];
const SUIT_ORDER: Suit[] = [
  Suit.Spades,
  Suit.Hearts,
  Suit.Clubs,
  Suit.Diamonds,
];

export const sortHand = (hand: Card[]): Card[] =>
  [...hand].sort(
    (a, b) =>
      RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank) ||
      SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit),
  );

/**
 * Splits a shuffled deck into SEAT_COUNT hands of CARDS_PER_PLAYER, sorted for
 * display (rules §4). The whole deck is dealt: nothing is held back, so the
 * returned hands always account for all 52 cards.
 */
export const dealHands = (deck: Card[]): Card[][] => {
  if (deck.length !== SEAT_COUNT * CARDS_PER_PLAYER) {
    throw new Error(
      `dealHands expects a full ${SEAT_COUNT * CARDS_PER_PLAYER}-card deck, got ${deck.length}`,
    );
  }
  const hands: Card[][] = [];
  for (let seat = 0; seat < SEAT_COUNT; seat++) {
    hands.push(
      sortHand(
        deck.slice(seat * CARDS_PER_PLAYER, (seat + 1) * CARDS_PER_PLAYER),
      ),
    );
  }
  return hands;
};

export const emptyRankCounts = (): Record<CardRank, number> =>
  Object.values(CardRank).reduce(
    (acc, rank) => {
      acc[rank] = 0;
      return acc;
    },
    {} as Record<CardRank, number>,
  );
