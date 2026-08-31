"use client";

import { Team } from "shared-types";
import { cn } from "@/lib/utils";

interface TeamScoreboardProps {
  scores: Record<Team, number>;
  myTeam?: Team;
  className?: string;
}

/**
 * Live A-vs-B totals (rules §8). Scoring is per team, never per player, so
 * this is the only score on the table — a player's own captures are their
 * team's captures the moment they happen.
 */
export const TeamScoreboard = ({
  scores,
  myTeam,
  className,
}: TeamScoreboardProps) => (
  <div className={cn("flex items-center gap-3 font-game", className)}>
    {[Team.A, Team.B].map((team) => (
      <div
        key={team}
        className={cn(
          "flex items-baseline gap-2 rounded-pill border px-3 py-1",
          team === myTeam
            ? "border-ink bg-surface"
            : "border-hairline bg-surface/60",
        )}
      >
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-widest",
            team === Team.A ? "text-team-a" : "text-team-b",
          )}
        >
          {team}
          {team === myTeam && <span className="sr-only"> (your team)</span>}
        </span>
        <span className="text-lg font-extrabold tabular-nums leading-none text-ink">
          {scores[team]}
        </span>
      </div>
    ))}
  </div>
);
