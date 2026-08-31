"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TurnTimerProps {
  /** Server-clock ms when this turn expires. */
  deadline: number | null;
  /** Full window length, so the bar knows what "full" is. */
  timerMs: number;
  /** serverNow − client Date.now(), from the latest broadcast. */
  clockOffset: number;
  className?: string;
}

/**
 * The 20s turn clock (rules §5), shown to EVERY player rather than only the
 * one on the clock: a table needs to see that the person thinking is running
 * out of time, and it is what makes an auto-thrown card legible rather than
 * random.
 *
 * Counts against the server's deadline converted to client time, never a
 * locally-started countdown, so it cannot drift away from the moment the
 * server will actually fire.
 */
export const TurnTimer = ({
  deadline,
  timerMs,
  clockOffset,
  className,
}: TurnTimerProps) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setRemaining(0);
      return;
    }
    const tick = () =>
      setRemaining(Math.max(0, deadline - clockOffset - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline, clockOffset]);

  if (!deadline) return null;

  const fraction = Math.max(0, Math.min(1, remaining / timerMs));
  const seconds = Math.ceil(remaining / 1000);
  const urgent = remaining <= 5000;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-24 overflow-hidden rounded-pill bg-hairline">
        <div
          className={cn(
            "h-full rounded-pill transition-[width] duration-100 ease-linear",
            urgent ? "bg-accent" : "bg-ink",
          )}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span
        className={cn(
          "w-6 text-right text-sm font-bold tabular-nums",
          urgent ? "text-accent" : "text-ink-muted",
        )}
      >
        {seconds}
      </span>
    </div>
  );
};
