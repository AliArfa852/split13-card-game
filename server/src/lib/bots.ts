import { BotDifficulty, Card, CardRank, CARD_POINTS } from "shared-types";
import { type Rng } from "./rng.js";

export interface BotView {
  /** The bot's own hand. Never empty when this is called: a bot only acts on
   *  its own turn, and a turn only exists while cards remain. */
  hand: Card[];
  /** Top of the table stack, or null when the stack is empty (first throw of
   *  the hand, or the throw right after a capture). */
  topCard: Card | null;
  /** How many of each rank have already been thrown this hand. Public
   *  knowledge — every throw happens face-up — so a bot using it is reading
   *  the table, not cheating. */
  playedRankCounts: Record<CardRank, number>;
  difficulty: BotDifficulty;
}

const matchesTop = (card: Card, topCard: Card | null): boolean =>
  topCard !== null && card.rank === topCard.rank;

const lowestValue = (hand: Card[]): Card =>
  hand.reduce((best, card) =>
    CARD_POINTS[card.rank] < CARD_POINTS[best.rank] ? card : best,
  );

const highestValue = (hand: Card[]): Card =>
  hand.reduce((best, card) =>
    CARD_POINTS[card.rank] > CARD_POINTS[best.rank] ? card : best,
  );

/**
 * Ranks no opponent can still hold: every copy is either already thrown or in
 * this bot's own hand. Throwing one of these guarantees the next seat cannot
 * capture off it — and because seats alternate teams, the next seat is always
 * an opponent, so that guarantee is always worth having.
 */
const isUnmatchableByOthers = (
  card: Card,
  hand: Card[],
  playedRankCounts: Record<CardRank, number>,
): boolean => {
  const inMyHand = hand.filter((c) => c.rank === card.rank).length;
  return 4 - playedRankCounts[card.rank] - inMyHand <= 0;
};

/**
 * Picks the card a bot throws on its turn. Rules §11.
 *
 * Every tier still captures when the rules let it — capture is not a strategy
 * a bot can decline, it is what a matching card does. What separates the tiers
 * is only what they throw when they cannot capture.
 */
export const chooseBotCard = (view: BotView, rng: Rng): Card => {
  const { hand, topCard, playedRankCounts, difficulty } = view;

  if (difficulty === BotDifficulty.EASY) {
    // Deliberately blind: it never looks for a match. It still captures when
    // its random pick happens to match, because the rules apply to everyone.
    return hand[Math.floor(rng.float() * hand.length)];
  }

  const capture = hand.find((card) => matchesTop(card, topCard));
  if (capture) return capture;

  if (difficulty === BotDifficulty.HARD) {
    // Nothing to capture, so the question is what is safe to put down. A card
    // nobody else can match cannot be captured off by the next seat, which
    // makes it the one moment it is safe to dump an expensive card.
    const safe = hand.filter((card) =>
      isUnmatchableByOthers(card, hand, playedRankCounts),
    );
    if (safe.length > 0) return highestValue(safe);
  }

  // NORMAL, and HARD with no safe throw: risk as few points as possible in a
  // stack someone else is likely to take.
  return lowestValue(hand);
};
