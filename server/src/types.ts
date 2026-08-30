import {
  BotDifficulty,
  Card,
  CardRank,
  CaptureInfo,
  ChatMessage,
  GameStage,
  HandResult,
  PlayerId,
  PlayerStatus,
  RichGameLogMessage,
  Team,
} from "shared-types";
import type { Rng } from "./lib/rng.js";

export interface ServerPlayer {
  id: PlayerId;
  name: string;
  socketId: string;
  /** 0-3. Fixed once the host starts the game; decides team and turn slot. */
  seatIndex: number;
  team: Team;
  isBot: boolean;
  isReady: boolean;
  isConnected: boolean;
  status: PlayerStatus;
  /** The player's real cards. Redacted for everyone but the owner before it
   *  leaves the server — see state-redactor.ts. */
  hand: Card[];
  forfeited: boolean;
}

export interface GameContext {
  gameId: string;
  rng: Rng;
  players: Record<PlayerId, ServerPlayer>;
  /** Index is the seat, value is who holds it. Length SEAT_COUNT. This IS the
   *  turn order: play is plain clockwise, and seats alternate team, which is
   *  what produces A -> B -> A -> B without any special-casing. */
  seats: (PlayerId | null)[];
  hostId: PlayerId | null;
  gameStage: GameStage;
  /** Whose turn it is, as a seat index. Null outside PLAYING. */
  currentSeat: number | null;

  /** The table stack, oldest first. The last element is the card that must be
   *  matched to capture. Emptied completely on every capture (rules §7). */
  stack: Card[];

  teamScores: Record<Team, number>;
  teamCardCounts: Record<Team, number>;
  lastCapture: CaptureInfo | null;

  /** Copies of each rank already thrown this hand. Drives the hard bot and the
   *  client's dead-rank display. Reset on every deal. */
  playedRankCounts: Record<CardRank, number>;

  botDifficulty: BotDifficulty;

  turnDeadline: number | null;
  turnTimerMs: number;

  result: HandResult | null;

  /** Cumulative hands won per team for the lobby's lifetime. Survives a new
   *  deal; a draw increments neither side. */
  teamWins: Record<Team, number>;
  rematchVotes: PlayerId[];
  roundEpoch: number;

  log: RichGameLogMessage[];
  chat: ChatMessage[];

  errorState: {
    message: string;
    errorType: "INVALID_ACTION" | "NETWORK_ERROR";
    affectedPlayerId?: PlayerId;
  } | null;
}

export type GameInput = {
  gameId: string;
  botDifficulty?: BotDifficulty;
  /** Omitted in production, which uses the system source. Supplying one makes
   *  the shuffle and the card ids reproducible, so a game can be replayed. */
  seed?: number;
};
