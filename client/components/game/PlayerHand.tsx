"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Card } from "shared-types";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { cardTravelTransition } from "@/lib/card-motion";
import { play } from "@/lib/sounds";
import { cn } from "@/lib/utils";

interface PlayerHandProps {
  hand: Card[];
  /** Rank on top of the stack, or null when the table is empty. */
  topRank: string | null;
  canThrow: boolean;
  onThrow: (cardId: string) => void;
  className?: string;
}

/**
 * Your own thirteen cards, always face-up to you (rules §4) and sorted by
 * rank so equal ranks sit together — the pairing that matters is the only
 * thing you ever look for here.
 *
 * Laid out as an overlapping fan rather than a flat row: thirteen cards do
 * not fit side by side on a phone, and the overlap is chosen so each card's
 * rank corner stays visible even when its body is covered. The selected card
 * lifts out of the fan so the one you are about to commit is unmistakable.
 */
export const PlayerHand = ({
  hand,
  topRank,
  canThrow,
  onThrow,
  className,
}: PlayerHandProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleClick = (card: Card) => {
    if (!canThrow) return;
    if (selectedId === card.id) {
      // Second click on the same card commits it. A card leaves your hand for
      // good, so it takes two deliberate taps rather than one stray one.
      play("click");
      onThrow(card.id);
      setSelectedId(null);
      return;
    }
    play("click");
    setSelectedId(card.id);
  };

  if (hand.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[clamp(4.5rem,12vh,7rem)] items-center justify-center text-xs font-semibold uppercase tracking-widest text-ink-muted",
          className,
        )}
      >
        No cards left
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex w-full max-w-3xl items-end justify-center overflow-x-auto px-4 pb-1 pt-6">
        <div className="flex items-end">
          {hand.map((card, i) => {
            const isSelected = selectedId === card.id;
            const wouldCapture = topRank !== null && card.rank === topRank;
            return (
              <motion.button
                key={card.id}
                layoutId={`card-${card.id}`}
                transition={cardTravelTransition.layout}
                type="button"
                onClick={() => handleClick(card)}
                disabled={!canThrow}
                animate={{ y: isSelected ? -18 : 0 }}
                whileHover={canThrow ? { y: -10 } : undefined}
                aria-label={`${card.rank} of ${card.suit}${
                  wouldCapture ? " — captures the table" : ""
                }`}
                aria-pressed={isSelected}
                className={cn(
                  "relative h-[clamp(4.5rem,12vh,7rem)] w-[clamp(3.2rem,8.6vh,5rem)] shrink-0 rounded-card transition-shadow",
                  // The overlap. Negative margin on every card but the first
                  // keeps the rank corner of the one underneath visible.
                  i > 0 && "-ml-[clamp(1.4rem,3.6vh,2.1rem)]",
                  canThrow ? "cursor-pointer" : "cursor-default",
                  isSelected && "z-20 drop-shadow-lg",
                  // A card that would capture is worth pointing at, since
                  // spotting it is the whole skill of the game.
                  wouldCapture &&
                    canThrow &&
                    "ring-2 ring-accent ring-offset-2 ring-offset-ground rounded-card",
                )}
                style={{ zIndex: isSelected ? 30 : i }}
                data-cursor-link
              >
                <PlayingCard card={card} className="h-full w-full" />
              </motion.button>
            );
          })}
        </div>
      </div>

      <p className="h-4 text-center text-xs font-semibold text-ink-muted">
        {!canThrow
          ? ""
          : selectedId
            ? "Tap again to throw it"
            : "Tap a card to pick it"}
      </p>
    </div>
  );
};
