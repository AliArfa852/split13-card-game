import {
  cardsPoints,
  ClientSplitGameState,
  Player,
  PlayerId,
} from "shared-types";
import type { GameContext } from "./game-machine.js";
import { sortHand } from "./lib/deck-utils.js";
import logger from "./lib/logger.js";

/**
 * Builds one player's view of the game.
 *
 * Split 13 has far less to hide than Check! did — a player always sees their
 * own thirteen cards, and every card ever thrown was thrown face-up, so the
 * stack is public in full. Exactly one thing is private: the CONTENTS of an
 * opponent's hand. That is redacted to `null` here, with only `handCount`
 * surviving, and it is the single leak this function exists to prevent. A
 * player who could read another hand would know every capture in advance.
 */
export const generatePlayerView = (
  snapshot: { context: GameContext },
  viewingPlayerId: string,
): ClientSplitGameState => {
  const { context } = snapshot;
  logger.debug(
    { gameId: context.gameId, viewingPlayerId },
    "Generating player view",
  );

  const clientPlayers: Record<PlayerId, Player> = {};

  for (const playerId in context.players) {
    const serverPlayer = context.players[playerId];
    const isViewingPlayer = playerId === viewingPlayerId;

    clientPlayers[playerId] = {
      id: serverPlayer.id,
      name: serverPlayer.name,
      seatIndex: serverPlayer.seatIndex,
      team: serverPlayer.team,
      isBot: serverPlayer.isBot,
      isHost: context.hostId === serverPlayer.id,
      isReady: serverPlayer.isReady,
      isConnected: serverPlayer.isConnected,
      status: serverPlayer.status,
      // Your own hand, sorted for display. Everyone else's is a count.
      hand: isViewingPlayer ? sortHand(serverPlayer.hand) : null,
      handCount: serverPlayer.hand.length,
      forfeited: serverPlayer.forfeited,
    };
  }

  const currentPlayerId =
    context.currentSeat !== null ? context.seats[context.currentSeat] : null;

  const cardsRemaining = Object.values(context.players).reduce(
    (total, player) => total + player.hand.length,
    0,
  );

  return {
    gameId: context.gameId,
    viewingPlayerId,
    hostId: context.hostId,
    players: clientPlayers,
    seats: [...context.seats],
    gameStage: context.gameStage,
    currentPlayerId,
    currentSeat: context.currentSeat,

    stack: [...context.stack],
    stackValue: cardsPoints(context.stack),

    teamScores: { ...context.teamScores },
    teamCardCounts: { ...context.teamCardCounts },
    lastCapture: context.lastCapture,

    playedRankCounts: { ...context.playedRankCounts },
    cardsRemaining,

    botDifficulty: context.botDifficulty,

    turnDeadline: context.turnDeadline,
    turnTimerMs: context.turnTimerMs,

    result: context.result,

    teamWins: { ...context.teamWins },
    rematchVotes: [...context.rematchVotes],
    roundEpoch: context.roundEpoch,

    log: context.log.filter(
      (entry) => entry.type === "public" || entry.actor?.id === viewingPlayerId,
    ),
    chat: context.chat,

    serverNow: Date.now(),
  };
};
