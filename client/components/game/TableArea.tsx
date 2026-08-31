"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Card } from "shared-types";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { cardTravelTransition } from "@/lib/card-motion";
import { cn } from "@/lib/utils";

interface TableAreaProps {
  stack: Card[];
  /** What capturing right now is worth (rules §9). */
  stackValue: number;
  className?: string;
}

// How many cards of the pile are drawn. The rest exist in the count: past a
// handful the fan stops reading as depth and starts reading as noise.
const VISIBLE_DEPTH = 5;

/**
 * The table stack: one pile that grows a card per throw and is swept away
 * whole by a capture.
 *
 * It shows its own point value, because that number is the entire decision
 * this game asks you to make — every throw either adds to a pot someone else
 * might take, or takes it.
 */
export const TableArea = ({ stack, stackValue, className }: TableAreaProps) => {
  const topCard = stack[stack.length - 1] ?? null;
  const shown = stack.slice(-VISIBLE_DEPTH);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <div className="relative flex h-[clamp(5rem,14vh,8rem)] w-[clamp(3.6rem,10vh,5.7rem)] items-center justify-center">
        {stack.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center rounded-card border border-dashed border-hairline text-center text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Empty
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {shown.map((card, i) => {
              // Older cards sit further back and slightly rotated, so the pile
              // reads as a pile without hiding the one card that matters.
              const depth = shown.length - 1 - i;
              return (
                <motion.div
                  key={card.id}
                  layoutId={`card-${card.id}`}
                  transition={cardTravelTransition.layout}
                  className="absolute inset-0"
                  style={{
                    zIndex: i,
                    transform: `translate(${depth * -3}px, ${depth * -3}px) rotate(${
                      depth % 2 === 0 ? -depth : depth
                    }deg)`,
                  }}
                >
                  <PlayingCard card={card} className="h-full w-full" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          {stack.length === 0
            ? "Table"
            : `${stack.length} card${stack.length === 1 ? "" : "s"}`}
        </span>
        {stack.length > 0 && (
          <span className="text-sm font-extrabold tabular-nums text-ink">
            worth {stackValue}
          </span>
        )}
        {topCard && (
          <span className="text-[11px] text-ink-muted">
            match a {topCard.rank === "T" ? "10" : topCard.rank} to take it
          </span>
        )}
      </div>
    </div>
  );
};
