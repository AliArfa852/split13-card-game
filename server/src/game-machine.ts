import { setup, assign, emit, enqueueActions } from "xstate";
import {
  BotDifficulty,
  Card,
  CARDS_PER_PLAYER,
  cardsPoints,
  ChatMessage,
  GameStage,
  InitialPlayerSetupData,
  PlayerActionType,
  PlayerId,
  PlayerStatus,
  RichGameLogMessage,
  SEAT_COUNT,
  Team,
  teamForSeat,
} from "shared-types";
import {
  createDeck,
  dealHands,
  emptyRankCounts,
  shuffleDeck,
} from "./lib/deck-utils.js";
import { chooseBotCard } from "./lib/bots.js";
import { createSeededRng, systemRng } from "./lib/rng.js";
import logger from "./lib/logger.js";
// Side-effect import required so TS can name the machine's inferred guard
// types when emitting declarations (avoids TS2742).
import "xstate/guards";
import type { GameContext, GameInput, ServerPlayer } from "./types.js";
import { produce } from "immer";

export type { GameContext } from "./types.js";

/** Rules §5. One window per turn; on expiry the server throws for the player. */
const TURN_TIMER_MS = parseInt(process.env.TURN_TIMER_MS || "20000", 10);
/** How long a bot "thinks" before throwing. Purely cosmetic pacing — without
 *  it three bot seats resolve in the same tick and a human sees the stack jump
 *  three cards with no idea what happened. */
const BOT_THINK_MS = parseInt(process.env.BOT_THINK_MS || "1100", 10);
/** Beat between the deal and the first turn, so the deal can animate. */
const DEAL_ANIMATION_MS = 900;
/** Beat on the scoring screen before the final result is committed. */
const SCORING_DURATION_MS = 1500;
const MAX_RETAINED_CHAT = 200;
const MAX_RETAINED_LOG = 300;

const BOT_NAMES = ["Ada", "Bo", "Cass", "Dex"];

let logEntrySeq = 0;
const createLogEntry = (
  gameId: string,
  data: Omit<RichGameLogMessage, "id" | "timestamp">,
): RichGameLogMessage => ({
  id: `log_${gameId}_${Date.now()}_${logEntrySeq++}`,
  timestamp: new Date().toISOString(),
  ...data,
});

const pushLog = (
  ctx: GameContext,
  data: Omit<RichGameLogMessage, "id" | "timestamp">,
) => {
  ctx.log.push(createLogEntry(ctx.gameId, data));
  if (ctx.log.length > MAX_RETAINED_LOG) {
    ctx.log.splice(0, ctx.log.length - MAX_RETAINED_LOG);
  }
};

const seatedPlayer = (
  ctx: GameContext,
  seat: number | null,
): ServerPlayer | null => {
  if (seat === null) return null;
  const id = ctx.seats[seat];
  return id ? (ctx.players[id] ?? null) : null;
};

const currentPlayer = (ctx: GameContext): ServerPlayer | null =>
  seatedPlayer(ctx, ctx.currentSeat);

const humanPlayers = (ctx: GameContext): ServerPlayer[] =>
  Object.values(ctx.players).filter((p) => !p.isBot);

const lowestFreeSeat = (ctx: GameContext): number =>
  ctx.seats.findIndex((s) => s === null);

// ================================================================================================
//                                    CORE RULES
// ================================================================================================

/**
 * The whole turn, rules §6-§8. One card leaves the thrower's hand; it either
 * captures the stack (its rank matches the top card) or becomes the new top.
 * Either way the seat advances — capturing never grants a second throw.
 *
 * Written as one pure function over context so the human path, the bot path
 * and the timeout path cannot drift apart: all three call this.
 */
const resolveThrow = (ctx: GameContext, player: ServerPlayer, card: Card) =>
  produce(ctx, (draft) => {
    const thrower = draft.players[player.id];
    thrower.hand = thrower.hand.filter((c) => c.id !== card.id);
    draft.playedRankCounts[card.rank] += 1;

    const topCard = draft.stack[draft.stack.length - 1] ?? null;
    const captures = topCard !== null && topCard.rank === card.rank;

    draft.stack.push(card);

    if (captures) {
      const points = cardsPoints(draft.stack);
      const cardCount = draft.stack.length;
      draft.teamScores[thrower.team] += points;
      draft.teamCardCounts[thrower.team] += cardCount;
      draft.lastCapture = {
        playerId: thrower.id,
        team: thrower.team,
        rank: card.rank,
        cardCount,
        points,
        occurredAt: Date.now(),
      };
      // Rules §7: the table is left completely empty. No leftover card.
      draft.stack = [];
      pushLog(draft, {
        message: `${thrower.name} captured ${cardCount} cards (${points} pts) with a ${card.rank}`,
        type: "public",
        tags: ["capture", "game-event"],
        actor: { id: thrower.id, name: thrower.name },
        payload: { team: thrower.team, points, cardCount, rank: card.rank },
      });
    } else {
      pushLog(draft, {
        message: `${thrower.name} threw a ${card.rank}`,
        type: "public",
        tags: ["throw", "player-action"],
        actor: { id: thrower.id, name: thrower.name },
        payload: { rank: card.rank, suit: card.suit },
      });
    }

    draft.currentSeat = ((draft.currentSeat ?? 0) + 1) % SEAT_COUNT;
    draft.turnDeadline = Date.now() + draft.turnTimerMs;
  });

const dealNewHand = (ctx: GameContext) =>
  produce(ctx, (draft) => {
    const deck = shuffleDeck(createDeck(draft.rng), draft.rng);
    const hands = dealHands(deck);

    for (let seat = 0; seat < SEAT_COUNT; seat++) {
      const playerId = draft.seats[seat];
      if (!playerId) continue;
      const player = draft.players[playerId];
      player.hand = hands[seat];
      player.status = PlayerStatus.PLAYING;
    }

    draft.stack = [];
    draft.playedRankCounts = emptyRankCounts();
    draft.teamScores = { [Team.A]: 0, [Team.B]: 0 };
    draft.teamCardCounts = { [Team.A]: 0, [Team.B]: 0 };
    draft.lastCapture = null;
    draft.result = null;
    draft.rematchVotes = [];
    draft.gameStage = GameStage.DEALING;

    // Rules §5: the hand's first seat is random, then plain clockwise.
    draft.currentSeat = Math.floor(draft.rng.float() * SEAT_COUNT);
    draft.turnDeadline = null;

    pushLog(draft, {
      message: `Cards dealt — ${CARDS_PER_PLAYER} each. ${
        seatedPlayer(draft, draft.currentSeat)?.name ?? "Someone"
      } starts.`,
      type: "public",
      tags: ["game-event", "system-message"],
    });
  });

/**
 * Rules §10. Equal totals is a draw: no sudden death, no shared win.
 *
 * Exported so the tie branch can be tested directly. An exact tie is rare
 * enough that a random sweep of whole hands will not reliably produce one,
 * and it is the one outcome with no second chance to get right.
 */
export const finishHand = (ctx: GameContext) =>
  produce(ctx, (draft) => {
    const a = draft.teamScores[Team.A];
    const b = draft.teamScores[Team.B];
    const isDraw = a === b;
    const winner = isDraw ? null : a > b ? Team.A : Team.B;

    draft.result = {
      winner,
      isDraw,
      teamScores: { ...draft.teamScores },
      // Whatever is still on the table was thrown but never matched. It is
      // discarded worth nothing to either side, and this is the only place
      // those points are visibly accounted for.
      strandedCardCount: draft.stack.length,
      strandedPoints: cardsPoints(draft.stack),
    };

    if (winner) draft.teamWins[winner] += 1;

    for (const player of Object.values(draft.players)) {
      player.status = PlayerStatus.FINISHED;
    }

    draft.gameStage = GameStage.SCORING;
    draft.currentSeat = null;
    draft.turnDeadline = null;

    pushLog(draft, {
      message: isDraw
        ? `Hand over — a draw at ${a} points each.`
        : `Hand over — Team ${winner} wins ${a > b ? a : b} to ${a > b ? b : a}.`,
      type: "public",
      tags: ["game-event", "system-message"],
      payload: { teamScores: { A: a, B: b }, isDraw },
    });
  });

// ================================================================================================
//                                    MACHINE
// ================================================================================================

type GameEvent =
  | {
      type: "PLAYER_JOIN_REQUEST";
      playerId: PlayerId;
      playerSetupData: InitialPlayerSetupData;
    }
  | { type: "PLAYER_RECONNECTED"; playerId: PlayerId; newSocketId: string }
  | { type: "PLAYER_DISCONNECTED"; playerId: PlayerId }
  | {
      type: PlayerActionType.CLAIM_SEAT;
      playerId: PlayerId;
      payload: { seatIndex: number };
    }
  | {
      type: PlayerActionType.SET_BOT_DIFFICULTY;
      playerId: PlayerId;
      payload: { difficulty: BotDifficulty };
    }
  | { type: PlayerActionType.DECLARE_LOBBY_READY; playerId: PlayerId }
  | { type: PlayerActionType.DECLARE_LOBBY_UNREADY; playerId: PlayerId }
  | { type: PlayerActionType.START_GAME; playerId: PlayerId }
  | { type: PlayerActionType.LEAVE_GAME; playerId: PlayerId }
  | {
      type: PlayerActionType.REMOVE_PLAYER;
      playerId: PlayerId;
      payload: { targetPlayerId: PlayerId };
    }
  | {
      type: PlayerActionType.THROW_CARD;
      playerId: PlayerId;
      payload: { cardId: string };
    }
  | { type: PlayerActionType.PLAY_AGAIN; playerId: PlayerId }
  | { type: PlayerActionType.REQUEST_PLAY_AGAIN; playerId: PlayerId }
  | {
      type: PlayerActionType.SEND_CHAT_MESSAGE;
      payload: { message: string; senderId: PlayerId; senderName: string };
    };

type EmittedEvent =
  | { type: "BROADCAST_GAME_STATE" }
  | { type: "BROADCAST_CHAT_MESSAGE"; chatMessage: ChatMessage }
  | {
      type: "SEND_EVENT_TO_PLAYER";
      payload: { playerId: PlayerId; eventName: string; eventData: unknown };
    };

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as GameInput,
    emitted: {} as EmittedEvent,
  },
  delays: {
    TURN_TIMER: ({ context }) => context.turnTimerMs,
    BOT_THINK: BOT_THINK_MS,
    DEAL_ANIMATION: DEAL_ANIMATION_MS,
    SCORING_BEAT: SCORING_DURATION_MS,
  },
  guards: {
    isHost: ({ context, event }) =>
      "playerId" in event && event.playerId === context.hostId,

    canStart: ({ context, event }) => {
      if (!("playerId" in event) || event.playerId !== context.hostId)
        return false;
      const humans = humanPlayers(context);
      // At least one real person, and nobody still saying "not yet". Bots fill
      // the rest, so a solo host against three bots is a legal table.
      return (
        humans.length > 0 &&
        humans.every((p) => p.id === context.hostId || p.isReady)
      );
    },

    canThrow: ({ context, event }) => {
      if (event.type !== PlayerActionType.THROW_CARD) return false;
      const player = currentPlayer(context);
      if (!player || player.id !== event.playerId) return false;
      return player.hand.some((c) => c.id === event.payload?.cardId);
    },

    currentIsBot: ({ context }) => currentPlayer(context)?.isBot === true,

    /** Every seat is filled and every seat was dealt the same count, so hands
     *  empty together: this is true only after all 52 cards are thrown. */
    handsExhausted: ({ context }) =>
      Object.values(context.players).every((p) => p.hand.length === 0),

    seatIsFree: ({ context, event }) => {
      if (event.type !== PlayerActionType.CLAIM_SEAT) return false;
      const { seatIndex } = event.payload ?? {};
      return (
        typeof seatIndex === "number" &&
        seatIndex >= 0 &&
        seatIndex < SEAT_COUNT &&
        context.seats[seatIndex] === null
      );
    },
  },
  actions: {
    broadcast: emit({ type: "BROADCAST_GAME_STATE" as const }),

    addPlayer: assign(({ context, event }) => {
      if (event.type !== "PLAYER_JOIN_REQUEST") return {};
      const { playerId, playerSetupData } = event;
      if (context.players[playerId]) return {};
      if (context.gameStage !== GameStage.WAITING_FOR_PLAYERS) return {};

      const requested = playerSetupData.seatIndex;
      const seat =
        typeof requested === "number" &&
        requested >= 0 &&
        requested < SEAT_COUNT &&
        context.seats[requested] === null
          ? requested
          : lowestFreeSeat(context);
      if (seat === -1) return {};

      return produce(context, (draft) => {
        const player: ServerPlayer = {
          id: playerId,
          name: playerSetupData.name,
          socketId: playerSetupData.socketId ?? "",
          seatIndex: seat,
          team: teamForSeat(seat),
          isBot: false,
          isReady: false,
          isConnected: true,
          status: PlayerStatus.WAITING,
          hand: [],
          forfeited: false,
        };
        draft.players[playerId] = player;
        draft.seats[seat] = playerId;
        if (!draft.hostId) draft.hostId = playerId;
        pushLog(draft, {
          message: `${player.name} took seat ${seat + 1} (Team ${player.team})`,
          type: "public",
          tags: ["system-message"],
          actor: { id: player.id, name: player.name },
        });
      });
    }),

    claimSeat: assign(({ context, event }) => {
      if (event.type !== PlayerActionType.CLAIM_SEAT) return {};
      const player = context.players[event.playerId];
      if (!player || player.isBot) return {};
      const target = event.payload.seatIndex;
      return produce(context, (draft) => {
        draft.seats[player.seatIndex] = null;
        draft.seats[target] = player.id;
        const moved = draft.players[player.id];
        moved.seatIndex = target;
        moved.team = teamForSeat(target);
        pushLog(draft, {
          message: `${moved.name} moved to seat ${target + 1} (Team ${moved.team})`,
          type: "public",
          tags: ["system-message"],
          actor: { id: moved.id, name: moved.name },
        });
      });
    }),

    setBotDifficulty: assign(({ context, event }) => {
      if (event.type !== PlayerActionType.SET_BOT_DIFFICULTY) return {};
      const difficulty = event.payload?.difficulty;
      if (!Object.values(BotDifficulty).includes(difficulty)) return {};
      return { botDifficulty: difficulty };
    }),

    setReady: assign(({ context, event }) =>
      produce(context, (draft) => {
        if (!("playerId" in event)) return;
        const player = draft.players[event.playerId];
        if (player)
          player.isReady = event.type === PlayerActionType.DECLARE_LOBBY_READY;
      }),
    ),

    /**
     * Locks the table (rules §2). Every seat still empty becomes a bot, so the
     * game always plays four-handed, and seats — and therefore teams — cannot
     * change again for the life of the room.
     */
    fillSeatsWithBots: assign(({ context }) =>
      produce(context, (draft) => {
        for (let seat = 0; seat < SEAT_COUNT; seat++) {
          if (draft.seats[seat] !== null) continue;
          const id = `bot_${seat}_${draft.gameId}`;
          draft.players[id] = {
            id,
            name: `${BOT_NAMES[seat]} (bot)`,
            socketId: "",
            seatIndex: seat,
            team: teamForSeat(seat),
            isBot: true,
            isReady: true,
            isConnected: true,
            status: PlayerStatus.WAITING,
            hand: [],
            forfeited: false,
          };
          draft.seats[seat] = id;
        }
        pushLog(draft, {
          message: `Table locked. Team A: seats 1 & 3. Team B: seats 2 & 4.`,
          type: "public",
          tags: ["system-message", "game-event"],
        });
      }),
    ),

    dealHand: assign(({ context }) => dealNewHand(context)),

    beginPlay: assign({
      gameStage: GameStage.PLAYING,
    }),

    setTurnDeadline: assign({
      turnDeadline: ({ context }) => Date.now() + context.turnTimerMs,
    }),

    applyThrow: assign(({ context, event }) => {
      if (event.type !== PlayerActionType.THROW_CARD) return {};
      const player = currentPlayer(context);
      if (!player) return {};
      const card = player.hand.find((c) => c.id === event.payload.cardId);
      if (!card) return {};
      return resolveThrow(context, player, card);
    }),

    /**
     * Rules §5. A window that runs out is still a real move: the server throws
     * a random card, and if it happens to match the top of the stack it
     * captures exactly as a chosen card would.
     */
    autoThrow: assign(({ context }) => {
      const player = currentPlayer(context);
      if (!player || player.hand.length === 0) return {};
      const card =
        player.hand[Math.floor(context.rng.float() * player.hand.length)];
      logger.info(
        { gameId: context.gameId, playerId: player.id },
        "Turn timer expired — throwing a random card",
      );
      const next = resolveThrow(context, player, card);
      return produce(next, (draft) => {
        pushLog(draft, {
          message: `${player.name} ran out of time — a card was thrown for them`,
          type: "public",
          tags: ["system-message"],
          actor: { id: player.id, name: player.name },
        });
      });
    }),

    botThrow: assign(({ context }) => {
      const player = currentPlayer(context);
      if (!player || player.hand.length === 0) return {};
      const card = chooseBotCard(
        {
          hand: player.hand,
          topCard: context.stack[context.stack.length - 1] ?? null,
          playedRankCounts: context.playedRankCounts,
          difficulty: context.botDifficulty,
        },
        context.rng,
      );
      return resolveThrow(context, player, card);
    }),

    finishHand: assign(({ context }) => finishHand(context)),

    toGameOver: assign({ gameStage: GameStage.GAMEOVER }),

    recordRematchVote: assign(({ context, event }) =>
      produce(context, (draft) => {
        if (!("playerId" in event)) return;
        const id = event.playerId;
        if (!draft.players[id]) return;
        draft.rematchVotes = draft.rematchVotes.includes(id)
          ? draft.rematchVotes.filter((v) => v !== id)
          : [...draft.rematchVotes, id];
      }),
    ),

    /** A new hand keeps the room: same seats, same teams, same cumulative
     *  team wins. Only the epoch and the log move here — DEALING's entry is
     *  what actually deals, so doing it here too would deal the hand twice. */
    prepareNextHand: assign(({ context }) =>
      produce(context, (draft) => {
        draft.roundEpoch += 1;
        draft.log = [];
      }),
    ),

    markDisconnected: assign(({ context, event }) =>
      produce(context, (draft) => {
        if (!("playerId" in event)) return;
        const player = draft.players[event.playerId];
        if (player) player.isConnected = false;
      }),
    ),

    markReconnected: assign(({ context, event }) =>
      produce(context, (draft) => {
        if (event.type !== "PLAYER_RECONNECTED") return;
        const player = draft.players[event.playerId];
        if (player) {
          player.isConnected = true;
          player.socketId = event.newSocketId;
        }
      }),
    ),

    removePlayerFromLobby: assign(({ context, event }) =>
      produce(context, (draft) => {
        if (!("playerId" in event)) return;
        const targetId =
          event.type === PlayerActionType.REMOVE_PLAYER
            ? event.payload.targetPlayerId
            : event.playerId;
        const target = draft.players[targetId];
        if (!target) return;
        // Only the host may remove someone else; anyone may remove themselves.
        if (
          event.type === PlayerActionType.REMOVE_PLAYER &&
          event.playerId !== draft.hostId
        )
          return;
        const seat = target.seatIndex;
        delete draft.players[targetId];

        if (draft.gameStage === GameStage.WAITING_FOR_PLAYERS) {
          draft.seats[seat] = null;
        } else {
          // The table is locked, so the seat cannot simply empty: an unheld
          // seat is a turn no one can take, and the hand would stall on its
          // timer forever. A bot inherits the seat, and with it the team.
          const botId = `bot_${seat}_${draft.gameId}`;
          draft.players[botId] = {
            id: botId,
            name: `${BOT_NAMES[seat]} (bot)`,
            socketId: "",
            seatIndex: seat,
            team: teamForSeat(seat),
            isBot: true,
            isReady: true,
            isConnected: true,
            status: PlayerStatus.WAITING,
            hand: [],
            forfeited: false,
          };
          draft.seats[seat] = botId;
        }

        if (draft.hostId === targetId) {
          draft.hostId = humanPlayers(draft)[0]?.id ?? null;
        }
      }),
    ),

    appendChat: enqueueActions(({ context, event, enqueue }) => {
      if (event.type !== PlayerActionType.SEND_CHAT_MESSAGE) return;
      const chatMessage: ChatMessage = {
        id: `chat_${Date.now()}_${logEntrySeq++}`,
        senderId: event.payload.senderId,
        senderName: event.payload.senderName,
        message: event.payload.message,
        timestamp: new Date().toISOString(),
      };
      enqueue.assign(({ context: ctx }) =>
        produce(ctx, (draft) => {
          draft.chat.push(chatMessage);
          if (draft.chat.length > MAX_RETAINED_CHAT) draft.chat.shift();
        }),
      );
      enqueue.emit({ type: "BROADCAST_CHAT_MESSAGE", chatMessage });
    }),
  },
}).createMachine({
  id: "game",
  context: ({ input }) => ({
    gameId: input.gameId,
    rng: input.seed !== undefined ? createSeededRng(input.seed) : systemRng,
    players: {},
    seats: Array.from({ length: SEAT_COUNT }, () => null),
    hostId: null,
    gameStage: GameStage.WAITING_FOR_PLAYERS,
    currentSeat: null,
    stack: [],
    teamScores: { [Team.A]: 0, [Team.B]: 0 },
    teamCardCounts: { [Team.A]: 0, [Team.B]: 0 },
    lastCapture: null,
    playedRankCounts: emptyRankCounts(),
    botDifficulty: input.botDifficulty ?? BotDifficulty.NORMAL,
    turnDeadline: null,
    turnTimerMs: TURN_TIMER_MS,
    result: null,
    teamWins: { [Team.A]: 0, [Team.B]: 0 },
    rematchVotes: [],
    roundEpoch: 0,
    log: [],
    chat: [],
    errorState: null,
  }),

  initial: GameStage.WAITING_FOR_PLAYERS,

  // Handled the same way in every stage.
  on: {
    PLAYER_DISCONNECTED: { actions: ["markDisconnected", "broadcast"] },
    PLAYER_RECONNECTED: { actions: ["markReconnected", "broadcast"] },
    [PlayerActionType.SEND_CHAT_MESSAGE]: { actions: "appendChat" },
  },

  states: {
    [GameStage.WAITING_FOR_PLAYERS]: {
      on: {
        PLAYER_JOIN_REQUEST: { actions: ["addPlayer", "broadcast"] },
        [PlayerActionType.CLAIM_SEAT]: {
          guard: "seatIsFree",
          actions: ["claimSeat", "broadcast"],
        },
        [PlayerActionType.SET_BOT_DIFFICULTY]: {
          guard: "isHost",
          actions: ["setBotDifficulty", "broadcast"],
        },
        [PlayerActionType.DECLARE_LOBBY_READY]: {
          actions: ["setReady", "broadcast"],
        },
        [PlayerActionType.DECLARE_LOBBY_UNREADY]: {
          actions: ["setReady", "broadcast"],
        },
        [PlayerActionType.LEAVE_GAME]: {
          actions: ["removePlayerFromLobby", "broadcast"],
        },
        [PlayerActionType.REMOVE_PLAYER]: {
          actions: ["removePlayerFromLobby", "broadcast"],
        },
        [PlayerActionType.START_GAME]: {
          guard: "canStart",
          target: GameStage.DEALING,
        },
      },
    },

    [GameStage.DEALING]: {
      entry: ["fillSeatsWithBots", "dealHand", "broadcast"],
      after: {
        DEAL_ANIMATION: { target: GameStage.PLAYING },
      },
    },

    [GameStage.PLAYING]: {
      entry: ["beginPlay"],
      initial: "routing",
      states: {
        // Single place that decides what happens next, so the human path, the
        // bot path and the timeout path all rejoin here after a throw.
        routing: {
          always: [
            { guard: "handsExhausted", target: `#game.${GameStage.SCORING}` },
            { guard: "currentIsBot", target: "botTurn" },
            { target: "humanTurn" },
          ],
        },
        humanTurn: {
          entry: ["setTurnDeadline", "broadcast"],
          on: {
            [PlayerActionType.THROW_CARD]: {
              guard: "canThrow",
              actions: "applyThrow",
              target: "routing",
            },
          },
          after: {
            TURN_TIMER: { actions: "autoThrow", target: "routing" },
          },
        },
        botTurn: {
          entry: ["setTurnDeadline", "broadcast"],
          after: {
            BOT_THINK: { actions: "botThrow", target: "routing" },
          },
        },
      },
    },

    [GameStage.SCORING]: {
      entry: ["finishHand", "broadcast"],
      after: {
        SCORING_BEAT: { target: GameStage.GAMEOVER },
      },
    },

    [GameStage.GAMEOVER]: {
      entry: ["toGameOver", "broadcast"],
      on: {
        [PlayerActionType.PLAY_AGAIN]: {
          guard: "isHost",
          target: GameStage.DEALING,
          actions: "prepareNextHand",
        },
        [PlayerActionType.REQUEST_PLAY_AGAIN]: {
          actions: ["recordRematchVote", "broadcast"],
        },
        [PlayerActionType.LEAVE_GAME]: {
          actions: ["removePlayerFromLobby", "broadcast"],
        },
      },
    },
  },
});
