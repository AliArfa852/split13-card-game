"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GameStage,
  PlayerActionType,
  SEAT_COUNT,
  Team,
  type Player,
} from "shared-types";
import {
  useUIActorRef,
  useUISelector,
  type UIMachineSnapshot,
} from "@/context/GameUIContext";
import { GameHeader } from "./GameHeader";
import { GameEventCaption } from "./GameEventCaption";
import { PlayerSeat } from "./PlayerSeat";
import { PlayerHand } from "./PlayerHand";
import { TableArea } from "./TableArea";
import { TeamScoreboard } from "./TeamScoreboard";
import { TurnTimer } from "./TurnTimer";
import SidePanel from "@/components/layout/SidePanel";
import { cn } from "@/lib/utils";

const selectBoard = (state: UIMachineSnapshot) => {
  const gs = state.context.currentGameState;
  return {
    localPlayerId: state.context.localPlayerId ?? null,
    players: gs?.players ?? null,
    seats: gs?.seats ?? null,
    currentPlayerId: gs?.currentPlayerId ?? null,
    stack: gs?.stack ?? null,
    stackValue: gs?.stackValue ?? 0,
    teamScores: gs?.teamScores ?? null,
    cardsRemaining: gs?.cardsRemaining ?? 0,
    turnDeadline: gs?.turnDeadline ?? null,
    turnTimerMs: gs?.turnTimerMs ?? 20000,
    gameStage: gs?.gameStage ?? null,
    result: gs?.result ?? null,
    teamWins: gs?.teamWins ?? null,
    rematchVotes: gs?.rematchVotes ?? null,
    hostId: gs?.hostId ?? null,
    serverClockOffset: state.context.serverClockOffset,
    // Only need the very last entry to know who most recently threw — see
    // `lastThrowSeat` below. Slicing here (not storing the whole log) keeps
    // this selector cheap on every broadcast.
    lastLogEntry: gs?.log.length ? gs.log[gs.log.length - 1] : null,
  };
};

/** Seat positions relative to the viewer, who always sits at the bottom.
 *  Play is clockwise, which from the viewer's chair runs bottom → left → top
 *  → right, so the seat that acts after you is on your left and your partner
 *  (two seats along, therefore same team) is opposite you. */
const relativeSeats = (mySeat: number) => ({
  left: (mySeat + 1) % SEAT_COUNT,
  top: (mySeat + 2) % SEAT_COUNT,
  right: (mySeat + 3) % SEAT_COUNT,
});

export const GameBoard = () => {
  const { send } = useUIActorRef();
  const b = useUISelector(selectBoard);

  const me: Player | null =
    (b.localPlayerId && b.players?.[b.localPlayerId]) || null;
  const mySeat = me?.seatIndex ?? 0;
  const positions = useMemo(() => relativeSeats(mySeat), [mySeat]);

  const seatPlayer = (seatIndex: number): Player | null => {
    const id = b.seats?.[seatIndex];
    return (id && b.players?.[id]) || null;
  };

  const isMyTurn = !!b.localPlayerId && b.currentPlayerId === b.localPlayerId;
  const result = b.result;
  const stack = b.stack ?? [];
  const topRank = stack.length ? stack[stack.length - 1].rank : null;

  // Which seat most recently threw, so the newest stack card can fly in from
  // that direction instead of just appearing. Read off the log rather than
  // `currentPlayerId` (which has already advanced to the *next* player by
  // the time this renders) — only a "throw" entry counts: a "capture" entry
  // clears the stack in the same server update the card was added in, so
  // there is never a persisted stack state to animate a captured throw into.
  const lastThrowerId =
    b.lastLogEntry?.tags.includes("throw") &&
    !b.lastLogEntry.tags.includes("capture")
      ? (b.lastLogEntry.actor?.id ?? null)
      : null;
  const lastThrowSeat =
    lastThrowerId && b.players
      ? (b.players[lastThrowerId]?.seatIndex ?? null)
      : null;
  const topCardEnterFrom: "top" | "left" | "right" | null =
    lastThrowSeat === null || lastThrowSeat === mySeat
      ? null
      : lastThrowSeat === positions.top
        ? "top"
        : lastThrowSeat === positions.left
          ? "left"
          : lastThrowSeat === positions.right
            ? "right"
            : null;
  const topCardEnterId = topCardEnterFrom
    ? (stack[stack.length - 1]?.id ?? null)
    : null;
  const isPlaying = b.gameStage === GameStage.PLAYING;
  const endScene =
    b.gameStage === GameStage.SCORING || b.gameStage === GameStage.GAMEOVER;

  const throwCard = (cardId: string) =>
    send({ type: PlayerActionType.THROW_CARD, payload: { cardId } });

  const seatFor = (position: "top" | "left" | "right") => (
    <PlayerSeat
      player={seatPlayer(positions[position])}
      seatIndex={positions[position]}
      isCurrent={
        !!b.currentPlayerId &&
        b.seats?.[positions[position]] === b.currentPlayerId
      }
      isLocalPlayer={false}
      isPartner={position === "top"}
      orientation={position}
    />
  );

  return (
    <div className="relative flex h-full w-full flex-col bg-ground font-game">
      <GameHeader />

      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2 md:px-6">
        <TeamScoreboard
          scores={b.teamScores ?? { [Team.A]: 0, [Team.B]: 0 }}
          myTeam={me?.team}
        />
        <div className="flex items-center gap-4">
          <span className="hidden text-xs font-semibold uppercase tracking-widest text-ink-muted sm:inline">
            {b.cardsRemaining} left
          </span>
          {isPlaying && (
            <TurnTimer
              deadline={b.turnDeadline}
              timerMs={b.turnTimerMs}
              clockOffset={b.serverClockOffset}
            />
          )}
        </div>
      </div>

      {!endScene && <GameEventCaption />}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Partner, opposite. Same team as you by construction: seats
            alternate, so two seats along is always your other half. */}
        <div className="flex shrink-0 justify-center pt-2">
          {seatFor("top")}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-between gap-2 px-2 md:px-6">
          {seatFor("left")}
          <TableArea
            stack={stack}
            stackValue={b.stackValue}
            enterFrom={topCardEnterFrom}
            enterCardId={topCardEnterId}
          />
          {seatFor("right")}
        </div>

        <div
          className={cn(
            "shrink-0 border-t pb-2 transition-colors",
            isMyTurn ? "border-ink" : "border-hairline",
          )}
        >
          <div className="flex items-center justify-center gap-2 pt-1.5 text-[11px] font-semibold uppercase tracking-widest">
            <span
              className={cn(
                me?.team === Team.A ? "text-team-a" : "text-team-b",
              )}
            >
              {me ? `You · Team ${me.team}` : "You"}
            </span>
            {isPlaying && (
              <span className={isMyTurn ? "text-ink" : "text-ink-muted"}>
                {isMyTurn ? "· your turn" : "· waiting"}
              </span>
            )}
          </div>
          <PlayerHand
            hand={me?.hand ?? []}
            topRank={topRank}
            canThrow={isMyTurn && isPlaying}
            onThrow={throwCard}
          />
        </div>
      </div>

      <AnimatePresence>
        {endScene && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-ground/90 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-8 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Hand over
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
                {result.isDraw ? (
                  "A draw"
                ) : (
                  <>
                    Team{" "}
                    <span
                      className={
                        result.winner === Team.A ? "text-team-a" : "text-team-b"
                      }
                    >
                      {result.winner}
                    </span>{" "}
                    wins
                  </>
                )}
              </h2>

              <div className="mt-6 flex items-center justify-center gap-8">
                {[Team.A, Team.B].map((team) => (
                  <div key={team} className="flex flex-col items-center">
                    <span
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-widest",
                        team === Team.A ? "text-team-a" : "text-team-b",
                      )}
                    >
                      Team {team}
                    </span>
                    <span className="text-4xl font-extrabold tabular-nums text-ink">
                      {result.teamScores[team]}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {b.teamWins?.[team] ?? 0} hand
                      {(b.teamWins?.[team] ?? 0) === 1 ? "" : "s"} won
                    </span>
                  </div>
                ))}
              </div>

              {result.strandedCardCount > 0 && (
                <p className="mt-4 text-xs text-ink-muted">
                  {result.strandedCardCount} cards were left on the table and
                  scored for nobody ({result.strandedPoints} points).
                </p>
              )}

              <div className="mt-8 flex flex-col items-center gap-3">
                {b.localPlayerId === b.hostId ? (
                  <button
                    onClick={() => send({ type: PlayerActionType.PLAY_AGAIN })}
                    className="h-12 rounded-pill bg-accent px-7 text-base font-bold text-accent-ink transition-colors hover:bg-accent/90"
                    data-cursor-link
                  >
                    Deal another hand
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      send({ type: PlayerActionType.REQUEST_PLAY_AGAIN })
                    }
                    className="h-12 rounded-pill border border-hairline bg-surface px-7 text-base font-bold text-ink transition-colors hover:bg-surface-2"
                    data-cursor-link
                  >
                    {b.rematchVotes?.includes(b.localPlayerId ?? "")
                      ? "Waiting for the host…"
                      : "I want another hand"}
                  </button>
                )}
                <button
                  onClick={() => send({ type: "LEAVE_GAME" })}
                  className="text-xs font-semibold text-ink-muted underline underline-offset-4 hover:text-ink"
                >
                  Leave table
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SidePanel />
    </div>
  );
};

export default GameBoard;
