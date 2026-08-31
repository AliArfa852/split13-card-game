"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Card } from "shared-types";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { cardTravelTransition } from "@/lib/card-motion";
import { cn } from "@/lib/utils";

type EnterDirection = "top" | "left" | "right";

interface TableAreaProps {
  stack: Card[];
  /** What capturing right now is worth (rules §9). */
  stackValue: number;
  /** Where the newest card should fly in from — the seat that threw it,
   *  relative to the viewer — or null when it was the viewer's own throw
   *  (that one already flies in on its own: PlayerHand and this component
   *  share a `card-${id}` layoutId, so Framer measures the real hand
   *  position and needs no extra help) or there is nothing to animate. */
  enterFrom?: EnterDirection | null;
  /** The specific card `enterFrom` applies to — only that card gets the
   *  entrance offset; every other visible card in the pile is unaffected. */
  enterCardId?: string | null;
  className?: string;
}

// How many cards of the pile are drawn. The rest exist in the count: past a
// handful the fan stops reading as depth and starts reading as noise.
const VISIBLE_DEPTH = 5;

// Off-screen-ish starting offset for a card flying in from an opponent's
// seat. Seats sit above (top/partner) and to either side (left/right) of the
// stack in GameBoard's layout, so the offset just walks back toward there.
const ENTER_OFFSET: Record<EnterDirection, { x: number; y: number }> = {
  top: { x: 0, y: -70 },
  left: { x: -70, y: 0 },
  right: { x: 70, y: 0 },
};

/**
 * The table stack: one pile that grows a card per throw and is swept away
 * whole by a capture.
 *
 * It shows its own point value, because that number is the entire decision
 * this game asks you to make — every throw either adds to a pot someone else
 * might take, or takes it.
 */
export const TableArea = ({
  stack,
  stackValue,
  enterFrom,
  enterCardId,
  className,
}: TableAreaProps) => {
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
              // Only the one card this throw actually added gets an entrance
              // offset — every other card already in the pile just holds its
              // depth position. `initial` is only ever consulted by Framer on
              // this element's first mount, so this stays correct even after
              // enterFrom/enterCardId move on to a later card next render.
              const enter =
                card.id === enterCardId && enterFrom
                  ? ENTER_OFFSET[enterFrom]
                  : null;
              return (
                <motion.div
                  key={card.id}
                  className="absolute inset-0"
                  style={{ zIndex: i }}
                  initial={
                    enter
                      ? { opacity: 0, x: enter.x, y: enter.y, scale: 0.85 }
                      : false
                  }
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  transition={cardTravelTransition.layout}
                >
                  {/* The inner element carries the layoutId: for the
                      viewer's own throw it is what Framer flies from the
                      hand (PlayerHand shares this exact `card-${id}`), so it
                      must stay free of the outer wrapper's own x/y/scale —
                      nesting them keeps the two animations from fighting
                      over the same transform. */}
                  <motion.div
                    layoutId={`card-${card.id}`}
                    transition={cardTravelTransition.layout}
                    className="absolute inset-0"
                    style={{
                      transform: `translate(${depth * -3}px, ${depth * -3}px) rotate(${
                        depth % 2 === 0 ? -depth : depth
                      }deg)`,
                    }}
                  >
                    <PlayingCard card={card} className="h-full w-full" />
                  </motion.div>
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
