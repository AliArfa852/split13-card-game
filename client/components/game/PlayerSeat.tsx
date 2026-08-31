"use client";

import { motion } from "framer-motion";
import { Bot, Crown, WifiOff } from "lucide-react";
import { Team, type Player } from "shared-types";
import { CardBack } from "@/components/cards/CardBack";
import { cn } from "@/lib/utils";

interface PlayerSeatProps {
  player: Player | null;
  seatIndex: number;
  isCurrent: boolean;
  isLocalPlayer: boolean;
  isPartner: boolean;
  /** "top" | "left" | "right" — drives how the fan is laid out. */
  orientation: "top" | "left" | "right";
  className?: string;
}

// Enough card backs to read as a hand without drawing thirteen of them.
const MAX_FANNED_BACKS = 6;

/**
 * One opponent (or your partner) at the table. Their hand is a count, never
 * faces: a player sees only their own cards, and that redaction is enforced
 * server-side in state-redactor.ts — this component could not show them.
 */
export const PlayerSeat = ({
  player,
  seatIndex,
  isCurrent,
  isLocalPlayer,
  isPartner,
  orientation,
  className,
}: PlayerSeatProps) => {
  if (!player) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-1 rounded-2xl border border-dashed border-hairline px-3 py-2 text-center",
          className,
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          Seat {seatIndex + 1}
        </span>
        <span className="text-xs text-ink-muted">Empty</span>
      </div>
    );
  }

  const backs = Math.min(player.handCount, MAX_FANNED_BACKS);
  const vertical = orientation === "left" || orientation === "right";

  return (
    <motion.div
      animate={{ scale: isCurrent ? 1.03 : 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border px-3 py-2 transition-colors",
        isCurrent
          ? "border-ink bg-surface shadow-sm"
          : "border-hairline bg-surface/60",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center",
          vertical ? "h-16 w-10" : "h-10 w-20",
        )}
      >
        {player.handCount === 0 ? (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Out of cards
          </span>
        ) : (
          Array.from({ length: backs }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute overflow-hidden rounded-[4px]",
                vertical ? "h-7 w-5" : "h-9 w-6",
              )}
              style={{
                transform: vertical
                  ? `translateY(${(i - (backs - 1) / 2) * 7}px)`
                  : `translateX(${(i - (backs - 1) / 2) * 9}px)`,
                zIndex: i,
              }}
            >
              <CardBack />
            </div>
          ))
        )}
      </div>

      <div className="flex min-w-0 max-w-[9rem] flex-col items-center gap-0.5">
        <span className="flex items-center gap-1 truncate text-sm font-bold text-ink">
          {player.isHost && (
            <Crown
              className="h-3 w-3 shrink-0 text-ink-muted"
              aria-label="Host"
            />
          )}
          {player.isBot && (
            <Bot className="h-3 w-3 shrink-0 text-ink-muted" aria-label="Bot" />
          )}
          {!player.isConnected && !player.isBot && (
            <WifiOff
              className="h-3 w-3 shrink-0 text-accent"
              aria-label="Disconnected"
            />
          )}
          <span className="truncate">{player.name}</span>
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest">
          <span
            className={cn(
              player.team === Team.A ? "text-team-a" : "text-team-b",
            )}
          >
            Team {player.team}
          </span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink-muted tabular-nums">
            {player.handCount}
          </span>
          {isPartner && (
            <>
              <span className="text-ink-muted">·</span>
              <span className="text-ink-muted">partner</span>
            </>
          )}
          {isLocalPlayer && (
            <>
              <span className="text-ink-muted">·</span>
              <span className="text-ink-muted">you</span>
            </>
          )}
        </span>
      </div>
    </motion.div>
  );
};
