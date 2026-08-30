// ================================================================================================
//                                      CORE ID & STATE TYPES
// ================================================================================================
export type PlayerId = string;
export type GameId = string;

// ================================================================================================
//                                      TABLE CONSTANTS
// ================================================================================================

/** Split 13 is a fixed four-seat game. There is no smaller or larger table. */
export const SEAT_COUNT = 4;

/** 52 cards split evenly, nothing held back. SEAT_COUNT * CARDS_PER_PLAYER === 52. */
export const CARDS_PER_PLAYER = 13;

/** Every turn is clocked; on expiry the server throws a random card for the
 *  player. Rules §5. Server may override via env; this is the contract default
 *  clients render against until a state update says otherwise. */
export const DEFAULT_TURN_TIMER_MS = 20_000;

// ================================================================================================
//                                      GAME ENUMERATIONS
// ================================================================================================
export enum GameStage {
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  DEALING = "DEALING",
  PLAYING = "PLAYING",
  SCORING = "SCORING",
  GAMEOVER = "GAMEOVER",
}

/** Two teams of two. Seat index decides the team and is locked once the host
 *  starts the game (rules §2), so this is never reassigned mid-hand. */
export enum Team {
  A = "A",
  B = "B",
}

export enum PlayerStatus {
  WAITING = "WAITING",
  PLAYING = "PLAYING",
  FINISHED = "FINISHED",
}

/** Room-wide setting chosen by the host before start. Applies to every bot
 *  seat in the room. Rules §11. */
export enum BotDifficulty {
  EASY = "EASY",
  NORMAL = "NORMAL",
  HARD = "HARD",
}

// ================================================================================================
//                                      CARD & DECK TYPES
// ================================================================================================
export interface Card {
  id: string;
  suit: Suit;
  rank: CardRank;
}

export enum Suit {
  Hearts = "H",
  Diamonds = "D",
  Clubs = "C",
  Spades = "S",
}

export enum CardRank {
  Ace = "A",
  Two = "2",
  Three = "3",
  Four = "4",
  Five = "5",
  Six = "6",
  Seven = "7",
  Eight = "8",
  Nine = "9",
  Ten = "T",
  Jack = "J",
  Queen = "Q",
  King = "K",
}

// ================================================================================================
//                                      SCORING
// ================================================================================================

/**
 * Rules §3. Ace 20, 2-9 five each, 10/J/Q/K ten each.
 * The full deck totals exactly 400 points, which is the cheapest available
 * assertion that a scoring change did not silently break the maths.
 */
export const CARD_POINTS: Record<CardRank, number> = {
  [CardRank.Ace]: 20,
  [CardRank.Two]: 5,
  [CardRank.Three]: 5,
  [CardRank.Four]: 5,
  [CardRank.Five]: 5,
  [CardRank.Six]: 5,
  [CardRank.Seven]: 5,
  [CardRank.Eight]: 5,
  [CardRank.Nine]: 5,
  [CardRank.Ten]: 10,
  [CardRank.Jack]: 10,
  [CardRank.Queen]: 10,
  [CardRank.King]: 10,
};

/** Point value of a full 52-card deck. Every card is dealt, so a hand's two
 *  team scores plus whatever is stranded on the table at the end must sum to
 *  this. */
export const FULL_DECK_POINTS = 400;

export const cardPoints = (card: Card): number => CARD_POINTS[card.rank];

export const cardsPoints = (cards: Card[]): number =>
  cards.reduce((total, card) => total + CARD_POINTS[card.rank], 0);

/**
 * Seats 1 and 3 are Team A, seats 2 and 4 are Team B (rules §2). Seat indices
 * are zero-based, so this alternates by parity, which is exactly what produces
 * the A -> B -> A -> B turn order from plain clockwise play.
 */
export const teamForSeat = (seatIndex: number): Team =>
  seatIndex % 2 === 0 ? Team.A : Team.B;

/** The other team. Used by scoring and by bot heuristics. */
export const opposingTeam = (team: Team): Team =>
  team === Team.A ? Team.B : Team.A;

// ================================================================================================
//                                      PLAYER & GAME STATE
// ================================================================================================

/**
 * A player as any client sees them.
 *
 * `hand` is populated ONLY for the viewing player: unlike Check!, a player
 * always sees their own cards, but an opponent's hand is still private and is
 * redacted to `null` with only `handCount` surviving. See
 * server/src/state-redactor.ts.
 */
export interface Player {
  id: PlayerId;
  name: string;
  /** 0-3, fixed for the life of the room. Decides team and turn position. */
  seatIndex: number;
  team: Team;
  isBot: boolean;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  status: PlayerStatus;
  /** The viewing player's own 13 cards, sorted for display. `null` for
   *  everyone else — only the count is public. */
  hand: Card[] | null;
  handCount: number;
  /** True when the player was dropped for failing to reconnect in time. */
  forfeited?: boolean;
}

/**
 * The most recent capture, so clients can animate the stack being swept up and
 * name who took it. Momentary: clients stop highlighting it a few seconds
 * after `occurredAt`.
 */
export interface CaptureInfo {
  playerId: PlayerId;
  team: Team;
  /** The rank that matched, for the "captured with a 7" caption. */
  rank: CardRank;
  cardCount: number;
  points: number;
  occurredAt: number;
}

/** How a hand ended. `winner` is null exactly when `isDraw` is true — equal
 *  team totals end the hand as a draw, with no sudden death (rules §10). */
export interface HandResult {
  winner: Team | null;
  isDraw: boolean;
  teamScores: Record<Team, number>;
  /** Cards thrown but never matched by anyone, discarded worth zero. Kept for
   *  the summary screen: it is the only place those points visibly vanish. */
  strandedCardCount: number;
  strandedPoints: number;
}

/**
 * The client-safe view of the game. Everything here is either public or
 * belongs to the viewing player.
 */
export interface ClientSplitGameState {
  gameId: GameId;
  viewingPlayerId: PlayerId;
  hostId: PlayerId | null;
  players: Record<PlayerId, Player>;
  /** Length SEAT_COUNT. Index is the seat; null is an unclaimed seat. Also the
   *  turn order, since play is plain clockwise around the seats. */
  seats: (PlayerId | null)[];
  gameStage: GameStage;
  currentPlayerId: PlayerId | null;
  currentSeat: number | null;

  /**
   * The whole table stack, oldest first, so the top card is the last element.
   * Sent in full rather than trimmed: every card in it was thrown face-up in
   * front of everyone, so none of it is private, and it is capped at 52.
   */
  stack: Card[];
  /** What capturing the stack right now would be worth. Shown to everyone
   *  (rules §9) — it is the number the whole risk decision turns on. */
  stackValue: number;

  teamScores: Record<Team, number>;
  /** Cards captured per team. Not used for winning; it is the "how did that
   *  score happen" number on the scoreboard. */
  teamCardCounts: Record<Team, number>;
  lastCapture: CaptureInfo | null;

  /** Count of each rank already thrown this hand (max 4). Public knowledge:
   *  every throw happened face-up. Lets a client show which ranks are dead. */
  playedRankCounts: Record<CardRank, number>;
  /** Cards still in hands across the whole table. Hits 0 exactly when the
   *  hand ends. */
  cardsRemaining: number;

  botDifficulty: BotDifficulty;

  /** When the current turn's 20s window expires. */
  turnDeadline: number | null;
  /** Full length of a turn window, for rendering the countdown. */
  turnTimerMs: number;

  result: HandResult | null;

  /** Cumulative hands won per team for this lobby's lifetime. Survives Play
   *  Again; a draw increments neither. */
  teamWins: Record<Team, number>;
  /** Players who signalled they want another hand at GAMEOVER. Advisory — the
   *  host's PLAY_AGAIN is what actually starts one. */
  rematchVotes: PlayerId[];
  /** Bumped on each Play Again. A client seeing a new epoch drops its
   *  accumulated log/chat instead of merging, so the panels start fresh. */
  roundEpoch: number;

  log: RichGameLogMessage[];
  chat: ChatMessage[];

  /**
   * Server wall-clock at redaction time. All absolute timestamps in this state
   * (turnDeadline, lastCapture.occurredAt) are on the server's clock; clients
   * derive an offset from this field instead of trusting Date.now().
   */
  serverNow: number;
}

// ================================================================================================
//                                    SOCKETS & COMMS
// ================================================================================================

export interface ServerToClientEvents {
  [SocketEventName.GAME_STATE_UPDATE]: (
    gameState: ClientSplitGameState,
  ) => void;
  [SocketEventName.SERVER_LOG_ENTRY]: (logMessage: RichGameLogMessage) => void;
  [SocketEventName.INITIAL_LOGS]: (logs: RichGameLogMessage[]) => void;
  [SocketEventName.ERROR_MESSAGE]: (error: { message: string }) => void;
  [SocketEventName.NEW_CHAT_MESSAGE]: (chatMessage: ChatMessage) => void;
  [SocketEventName.SEAT_CLAIMED_ELSEWHERE]: () => void;
}

export interface ClientToServerEvents {
  [SocketEventName.CREATE_GAME]: (
    payload: CreateGamePayload,
    callback: (response: CreateGameResponse) => void,
  ) => void;
  [SocketEventName.JOIN_GAME]: (
    gameId: string,
    playerSetupData: InitialPlayerSetupData,
    callback: (response: JoinGameResponse) => void,
  ) => void;
  [SocketEventName.ATTEMPT_REJOIN]: (
    payload: { gameId: string; playerId: string; token?: string },
    callback: (response: AttemptRejoinResponse) => void,
  ) => void;
  [SocketEventName.PLAYER_ACTION]: (payload: {
    type: PlayerActionType;
    payload?: any;
  }) => void;
  [SocketEventName.SEND_CHAT_MESSAGE]: (payload: {
    message: string;
    senderId: string;
    senderName: string;
    gameId: string;
  }) => void;
}

export type ServerToClientEventName = keyof ServerToClientEvents;

export enum SocketEventName {
  CREATE_GAME = "CREATE_GAME",
  JOIN_GAME = "JOIN_GAME",
  PLAYER_ACTION = "PLAYER_ACTION",
  GAME_STATE_UPDATE = "GAME_STATE_UPDATE",
  ERROR_MESSAGE = "ERROR_MESSAGE",
  ATTEMPT_REJOIN = "ATTEMPT_REJOIN",
  SEND_CHAT_MESSAGE = "SEND_CHAT_MESSAGE",
  SERVER_LOG_ENTRY = "SERVER_LOG_ENTRY",
  INITIAL_LOGS = "INITIAL_LOGS",
  NEW_CHAT_MESSAGE = "NEW_CHAT_MESSAGE",
  /** Sent to a client whose seat has just been claimed by another one, so it
   *  can say so instead of freezing. Only ever reaches a socket that is still
   *  open, which is what separates a takeover from an ordinary reconnect. */
  SEAT_CLAIMED_ELSEWHERE = "SEAT_CLAIMED_ELSEWHERE",
}

export interface BasicResponse {
  success: boolean;
  message?: string;
}

export interface CreateGameResponse extends BasicResponse {
  gameId?: GameId;
  playerId?: PlayerId;
  gameState?: ClientSplitGameState;
  /** Proves this seat is yours when reconnecting. Never appears in any
   *  broadcast or redacted view, so no other player can learn it. */
  reconnectToken?: string;
}

export interface JoinGameResponse extends BasicResponse {
  gameId?: GameId;
  playerId?: PlayerId;
  gameState?: ClientSplitGameState;
  /** See CreateGameResponse.reconnectToken. */
  reconnectToken?: string;
}

export interface AttemptRejoinResponse extends BasicResponse {
  gameId?: GameId;
  playerId?: PlayerId;
  gameState?: ClientSplitGameState;
  logs?: RichGameLogMessage[];
}

export interface InitialPlayerSetupData {
  name: string;
  id?: string;
  socketId?: string;
  /** Preferred seat (0-3). Ignored if taken; the server assigns the lowest
   *  free seat instead. Seat decides team, so this is the team choice. */
  seatIndex?: number;
}

/** CREATE_GAME payload: the host's setup data plus the room settings they
 *  picked. Table size is fixed at SEAT_COUNT, so difficulty is the only one. */
export interface CreateGamePayload extends InitialPlayerSetupData {
  botDifficulty?: BotDifficulty;
}

export interface ChatMessage {
  id: string;
  senderId: PlayerId;
  senderName: string;
  message: string;
  timestamp: string;
}

// ================================================================================================
//                                    LOGGING & ACTIONS
// ================================================================================================

export interface RichGameLogMessage {
  id: string;
  timestamp: string;
  message: string;
  type: "public" | "private";
  tags: (
    | "game-event"
    | "player-action"
    | "system-message"
    | "error"
    | "throw"
    | "capture"
  )[];
  payload?: Record<string, unknown>;
  actor?: {
    id: PlayerId;
    name: string;
  };
}

export enum PlayerActionType {
  // Lobby
  START_GAME = "START_GAME",
  CLAIM_SEAT = "CLAIM_SEAT",
  SET_BOT_DIFFICULTY = "SET_BOT_DIFFICULTY",
  DECLARE_LOBBY_READY = "DECLARE_LOBBY_READY",
  DECLARE_LOBBY_UNREADY = "DECLARE_LOBBY_UNREADY",
  LEAVE_GAME = "LEAVE_GAME",
  REMOVE_PLAYER = "REMOVE_PLAYER",

  // The entire turn. One card, once per turn.
  THROW_CARD = "THROW_CARD",

  // Between hands
  PLAY_AGAIN = "PLAY_AGAIN",
  /** Non-host "I want another hand" toggle. Advisory only — it adds/removes
   *  the player from rematchVotes so everyone sees demand; the host's
   *  PLAY_AGAIN is what actually deals. */
  REQUEST_PLAY_AGAIN = "REQUEST_PLAY_AGAIN",

  // Misc
  SEND_CHAT_MESSAGE = "SEND_CHAT_MESSAGE",
}

/** THROW_CARD payload. The card must be in the thrower's hand and it must be
 *  their turn; everything else about the outcome is decided by the server. */
export interface ThrowCardPayload {
  cardId: string;
}

export interface ClaimSeatPayload {
  seatIndex: number;
}

export interface SetBotDifficultyPayload {
  difficulty: BotDifficulty;
}
