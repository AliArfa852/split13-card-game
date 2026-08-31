import {
  setup,
  assign,
  emit,
  assertEvent,
  type ActorRefFrom,
  type SnapshotFrom,
  type StateFrom,
  raise,
  enqueueActions,
} from "xstate";
import {
  PlayerActionType,
  SocketEventName,
  GameStage,
  type BotDifficulty,
  type ClientSplitGameState,
  type CreateGameResponse,
  type JoinGameResponse,
  type ChatMessage,
  type RichGameLogMessage,
} from "shared-types";
import { toast } from "sonner";
import logger from "@/lib/logger";
import { createGameActor, joinGameActor, rejoinActor } from "@/lib/actors";

// How long a move may go unanswered before we stop trusting the connection.
// Every player action ends in a broadcast, so silence this long means the
// server has stopped talking to us while the socket has not yet noticed.
const ACTION_ANSWER_TIMEOUT_MS = 8000;

// A free-tier server spins down after 15 minutes idle and takes roughly a
// minute to answer the first request after that. HANDSHAKE_TIMEOUT_MS in
// actors.ts is sized to cover it, so the request is working the whole time.
// These phases exist because nothing on screen said so: a spinner that has not
// moved in forty seconds reads as a hang, and the reasonable response to a
// hang is a reload, which throws away the wake already paid for.
//
// Both thresholds are measured, not guessed. A warm production create takes up
// to 2.5s end to end, because the emit waits on a socket that itself needs a
// couple of seconds, so anything under about 4s fires at a healthy server.
// The far end is bounded by the player: they start reloading around 20s, so
// the explanation has to be on screen well before that or it arrives too late
// to stop the thing it exists to prevent.
const WAKE_HINT_AFTER_MS = 5000;
const WAKE_EXPLAIN_AFTER_MS = 12000;

// Named so the exit action can cancel them. A raise still in flight when the
// wait ends would otherwise land in whatever state follows and show the notice
// over a screen that is not waiting for anything.
const COLD_START_HINT_ID = "coldStartHint";
const COLD_START_EXPLAIN_ID = "coldStartExplain";

type ServerToClientEvents =
  | { type: "CLIENT_GAME_STATE_UPDATED"; gameState: ClientSplitGameState }
  | { type: "NEW_GAME_LOG"; logMessage: RichGameLogMessage }
  | { type: "NEW_CHAT_MESSAGE"; chatMessage: ChatMessage }
  | { type: "ERROR_RECEIVED"; error: string }
  | { type: "INITIAL_LOGS_RECEIVED"; logs: RichGameLogMessage[] };

type SocketEmitEvent = {
  eventName: SocketEventName.PLAYER_ACTION;
  payload: { type: PlayerActionType | string; payload?: unknown };
};

type EmittedEventToSocket = { type: "EMIT_TO_SOCKET" } & SocketEmitEvent;

export type UIMachineInput = {
  gameId?: string;
  localPlayerId?: string;
  reconnectToken?: string;
};

export interface UIMachineContext {
  gameId?: string;
  currentGameState?: ClientSplitGameState;
  localPlayerId?: string;
  /** Proves this seat is ours when rejoining. Server-issued, never broadcast. */
  reconnectToken?: string;
  isSidePanelOpen: boolean;
  reconnectionAttempts: number;
  /** serverNow − client Date.now(), from the latest broadcast. Server
   *  timestamps convert to client-clock via `ts - serverClockOffset`. */
  serverClockOffset: number;
  /** client Date.now() when the latest broadcast was applied. Paired with the
   *  broadcast's serverNow, this anchors short countdowns (the 5s match window)
   *  to receipt time — immune to device-clock skew AND the serverClockOffset
   *  jitter gate, which together drifted the match ring to ~75% on prod. */
  lastStateReceivedAt: number;
  modal: { type: "rejoin" | "error"; title: string; message: string } | null;
  /** Date.now() when the last game action was emitted; null once any state
   *  update lands. Drives the action bar's in-flight disable. */
  pendingActionSince: number | null;
  /** How much the modals say about a wait that is still in flight. Escalates on
   *  elapsed time alone, so a cold server's minute does not read as a hang. */
  coldStartPhase: "silent" | "waking" | "explaining";
}

export type UIMachineEvents =
  | ServerToClientEvents
  | {
      type: "_SESSION_ESTABLISHED";
      response: CreateGameResponse | JoinGameResponse;
    }
  | {
      type: "CREATE_GAME_REQUESTED";
      playerName: string;
      botDifficulty?: BotDifficulty;
    }
  | { type: "JOIN_GAME_REQUESTED"; playerName: string; gameId: string }
  | { type: "LEAVE_GAME" }
  | { type: "SUBMIT_CHAT_MESSAGE"; message: string }
  | { type: "ACTION_NOT_SENT" }
  | { type: "ACTION_UNANSWERED" }
  | { type: "_COLD_START_WAKING" }
  | { type: "_COLD_START_EXPLAINING" }
  | { type: "SEAT_CLAIMED_ELSEWHERE" }
  | { type: "TOGGLE_SIDE_PANEL" }
  | { type: "DISMISS_MODAL" }
  | { type: "CONNECT"; recovered?: boolean }
  | { type: "RETRY_REJOIN" }
  | { type: "DISCONNECT" }
  | { type: PlayerActionType.START_GAME }
  | { type: PlayerActionType.DECLARE_LOBBY_READY }
  | { type: PlayerActionType.DECLARE_LOBBY_UNREADY }
  | {
      type: PlayerActionType.REMOVE_PLAYER;
      payload: { playerIdToRemove: string };
    }
  | { type: PlayerActionType.CLAIM_SEAT; payload: { seatIndex: number } }
  | {
      type: PlayerActionType.SET_BOT_DIFFICULTY;
      payload: { difficulty: BotDifficulty };
    }
  // One card, once per turn. This is the entire in-game move set.
  | { type: PlayerActionType.THROW_CARD; payload: { cardId: string } }
  | { type: PlayerActionType.PLAY_AGAIN }
  | { type: PlayerActionType.REQUEST_PLAY_AGAIN };

/** Adopt a new server-clock offset sample only when it differs from the
 *  current one by more than transport jitter. Each sample is true skew +
 *  network transit, so it wobbles by tens of ms per broadcast; consumers
 *  derive animation keys and deadlines from the offset, and a wobbling
 *  offset re-keys/restarts those animations on every broadcast. Real skew
 *  worth correcting is seconds to minutes. */
const SERVER_CLOCK_JITTER_TOLERANCE_MS = 1500;
const adoptServerClockOffset = (
  current: number,
  serverNow: number | undefined,
): number => {
  if (typeof serverNow !== "number") return current;
  const sample = serverNow - Date.now();
  return Math.abs(sample - current) > SERVER_CLOCK_JITTER_TOLERANCE_MS
    ? sample
    : current;
};

/** Broadcasts carry only a recent tail of the append-only log/chat; keep the
 *  locally accumulated history and append whatever is new (dedup by id,
 *  incoming version wins). */
// Chat survives Play Again, so this copy is the only one that grows for the
// life of the lobby. Matches the server's own retention cap.
const MAX_RETAINED_CHAT = 200;

const mergeAppendOnly = <T extends { id: string }>(
  prev: T[] | undefined,
  incoming: T[],
): T[] => {
  if (!prev?.length) return incoming;
  const incomingIds = new Set(incoming.map((e) => e.id));
  return [...prev.filter((e) => !incomingIds.has(e.id)), ...incoming];
};

export const uiMachine = setup({
  types: {
    context: {} as UIMachineContext,
    events: {} as UIMachineEvents,
    emitted: {} as EmittedEventToSocket | { type: "NAVIGATE"; path: string },
    input: {} as UIMachineInput,
  },
  actors: {
    createGame: createGameActor,
    joinGame: joinGameActor,
    rejoinAndPoll: rejoinActor,
  },
  actions: {
    setCurrentGameState: assign({
      currentGameState: ({ context, event }) => {
        assertEvent(event, [
          "CLIENT_GAME_STATE_UPDATED",
          "_SESSION_ESTABLISHED",
        ]);
        const incoming =
          event.type === "CLIENT_GAME_STATE_UPDATED"
            ? event.gameState
            : "gameState" in event.response
              ? event.response.gameState
              : undefined;
        if (!incoming) return undefined;
        // A bumped roundEpoch means the server reset its log for a new round
        // (Play Again). Merging would resurrect the old round's entries from
        // our accumulated copy, so start fresh from the incoming array.
        //
        // Chat is deliberately merged across the bump instead: the server keeps
        // it through the reset, and a broadcast only carries the recent tail, so
        // replacing here would drop everything said earlier in the session.
        const prevState = context.currentGameState;
        const sameEpoch =
          (prevState?.roundEpoch ?? 0) === (incoming.roundEpoch ?? 0);
        return {
          ...incoming,
          log: sameEpoch
            ? mergeAppendOnly(prevState?.log, incoming.log)
            : incoming.log,
          chat: mergeAppendOnly(prevState?.chat, incoming.chat).slice(
            -MAX_RETAINED_CHAT,
          ),
        };
      },
      // "Pass" is final per matching opportunity, so only reset the flag when
      // the incoming state carries a different (or no) matching opportunity.

      serverClockOffset: ({ context, event }) => {
        const nextState =
          event.type === "CLIENT_GAME_STATE_UPDATED"
            ? event.gameState
            : event.type === "_SESSION_ESTABLISHED" &&
                "gameState" in event.response
              ? event.response.gameState
              : undefined;
        return adoptServerClockOffset(
          context.serverClockOffset,
          nextState?.serverNow,
        );
      },
      // Stamp receipt time alongside the state it belongs to, so consumers can
      // pair it with this broadcast's serverNow for skew/gate-free countdowns.
      lastStateReceivedAt: () => Date.now(),
      localPlayerId: ({ context, event }) => {
        if (context.localPlayerId) return context.localPlayerId;
        if (event.type === "CLIENT_GAME_STATE_UPDATED") {
          return event.gameState.viewingPlayerId;
        }
        if (
          event.type === "_SESSION_ESTABLISHED" &&
          "playerId" in event.response
        ) {
          return event.response.playerId;
        }
        return undefined;
      },
      gameId: ({ context, event }) => {
        if (context.gameId) return context.gameId;
        if (event.type === "CLIENT_GAME_STATE_UPDATED") {
          return event.gameState.gameId;
        }
        if (
          event.type === "_SESSION_ESTABLISHED" &&
          "gameId" in event.response
        ) {
          return event.response.gameId;
        }
        return undefined;
      },
      pendingActionSince: () => null,
    }),
    addGameLog: assign({
      currentGameState: ({ context, event }) => {
        assertEvent(event, "NEW_GAME_LOG");
        if (!context.currentGameState) return undefined;
        return {
          ...context.currentGameState,
          log: [...context.currentGameState.log, event.logMessage],
        };
      },
    }),
    addChatMessage: assign({
      currentGameState: ({ context, event }) => {
        assertEvent(event, "NEW_CHAT_MESSAGE");
        if (!context.currentGameState) return undefined;
        return {
          ...context.currentGameState,
          chat: [...context.currentGameState.chat, event.chatMessage].slice(
            -MAX_RETAINED_CHAT,
          ),
        };
      },
    }),
    setInitialLogs: assign({
      currentGameState: ({ context, event }) => {
        assertEvent(event, "INITIAL_LOGS_RECEIVED");
        if (!context.currentGameState) return undefined;
        return { ...context.currentGameState, log: event.logs };
      },
    }),
    setGameIdAndPlayerId: assign({
      gameId: ({ event }) => {
        assertEvent(event, "_SESSION_ESTABLISHED");
        return event.response.gameId!;
      },
      localPlayerId: ({ event }) => {
        assertEvent(event, "_SESSION_ESTABLISHED");
        return event.response.playerId!;
      },
      reconnectToken: ({ event }) => {
        assertEvent(event, "_SESSION_ESTABLISHED");
        return event.response.reconnectToken;
      },
    }),
    resetGameContext: assign({
      localPlayerId: undefined,
      gameId: undefined,
      reconnectToken: undefined,
      currentGameState: undefined,

          reconnectionAttempts: 0,
      pendingActionSince: null,
    }),
    armColdStartPhases: enqueueActions(({ enqueue }) => {
      enqueue.assign({ coldStartPhase: "silent" as const });
      enqueue.raise(
        { type: "_COLD_START_WAKING" },
        { delay: WAKE_HINT_AFTER_MS, id: COLD_START_HINT_ID },
      );
      enqueue.raise(
        { type: "_COLD_START_EXPLAINING" },
        { delay: WAKE_EXPLAIN_AFTER_MS, id: COLD_START_EXPLAIN_ID },
      );
    }),
    disarmColdStartPhases: enqueueActions(({ enqueue }) => {
      enqueue.cancel(COLD_START_HINT_ID);
      enqueue.cancel(COLD_START_EXPLAIN_ID);
      enqueue.assign({ coldStartPhase: "silent" as const });
    }),
    markActionPending: enqueueActions(({ enqueue }) => {
      enqueue.assign({ pendingActionSince: () => Date.now() });
      enqueue.raise(
        { type: "ACTION_UNANSWERED" },
        { delay: ACTION_ANSWER_TIMEOUT_MS, id: "actionAnswerWatchdog" },
      );
    }),
    persistSession: ({ event }) => {
      assertEvent(event, "_SESSION_ESTABLISHED");
      if (
        !event.response.success ||
        !event.response.gameId ||
        !event.response.playerId
      )
        return;
      if (typeof window !== "undefined") {
        const sessionData = {
          gameId: event.response.gameId,
          playerId: event.response.playerId,
          reconnectToken: event.response.reconnectToken,
        };
        const sessionJSON = JSON.stringify(sessionData);
        localStorage.setItem("playerSession", sessionJSON);
        sessionStorage.setItem("playerSession", sessionJSON); // store in sessionStorage too
      }
    },
    clearSession: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("playerSession");
        sessionStorage.removeItem("playerSession");
      }
    },
    emitChatMessage: emit(({ event }) => {
      assertEvent(event, "SUBMIT_CHAT_MESSAGE");
      // Sender identity is derived server-side from the socket session.
      return {
        type: "EMIT_TO_SOCKET",
        eventName: SocketEventName.PLAYER_ACTION,
        payload: {
          type: PlayerActionType.SEND_CHAT_MESSAGE,
          payload: { message: event.message },
        },
      } as const;
    }),
    emitPlayerAction: emit(({ event }) => {
      const { type, ...rest } = event as { type: string } & Record<
        string,
        unknown
      >;
      return {
        type: "EMIT_TO_SOCKET",
        eventName: SocketEventName.PLAYER_ACTION,
        payload: { type, ...rest },
      } as const;
    }),

    emitLeaveGame: emit(() => ({
      type: "EMIT_TO_SOCKET" as const,
      eventName: SocketEventName.PLAYER_ACTION as const,
      payload: { type: PlayerActionType.LEAVE_GAME },
    })),

    showErrorToast: ({ event }) => {
      assertEvent(event, "ERROR_RECEIVED");
      toast.error(event.error);
    },
    toggleSidePanel: assign({
      isSidePanelOpen: ({ context }) => !context.isSidePanelOpen,
    }),





    resetReconnectionAttempts: assign({ reconnectionAttempts: 0 }),
    dismissModal: assign({ modal: null }),
    redirectToHome: () => {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    },
    logInitializing: ({ context }) => {
      logger.info(
        {
          machine: "uiMachine",
          state: "initializing",
          context: {
            gameId: context.gameId,
            localPlayerId: context.localPlayerId,
            hasGameState: !!context.currentGameState,
          },
        },
        "Machine entered initializing state",
      );
    },
    logToOutOfGame: () =>
      logger.info(
        { machine: "uiMachine", transition: "to outOfGame" },
        "Routing to out-of-game",
      ),
    logToPromptToJoin: () =>
      logger.info(
        { machine: "uiMachine", transition: "to promptToJoin" },
        "Routing to promptToJoin",
      ),
    logToReconnecting: () =>
      logger.info(
        { machine: "uiMachine", transition: "to reconnecting" },
        "Routing to reconnecting",
      ),
    logJoiningGame: () =>
      logger.info(
        { machine: "uiMachine", event: "JOIN_GAME_REQUESTED" },
        "Invoking joinGame actor",
      ),
    logSessionEstablished: () =>
      logger.info(
        { machine: "uiMachine", event: "_SESSION_ESTABLISHED" },
        "Session established",
      ),
    log_ENTER_LOBBY: () =>
      logger.info({ machine: "ui", view: "Lobby" }, "UI state entered Lobby"),
    log_ENTER_GAME_BOARD: () =>
      logger.info(
        { machine: "ui", view: "Game Board" },
        "UI state entered main gameplay",
      ),
    log_ENTER_SCORING: () =>
      logger.info(
        { machine: "ui", view: "Scoring" },
        "UI state entered Scoring",
      ),
    log_ENTER_GAMEOVER: () =>
      logger.info(
        { machine: "ui", view: "Game Over" },
        "UI state entered Game Over",
      ),
    incrementReconnectionAttemptsAndScheduleRetry: enqueueActions(
      ({ context, enqueue }) => {
        const attempts = context.reconnectionAttempts + 1;
        enqueue.assign({ reconnectionAttempts: attempts });
        const delay = Math.min(1000 * 2 ** (attempts - 1), 15000);
        enqueue.raise({ type: "RETRY_REJOIN" }, { delay });
      },
    ),
  },
  guards: {

  },
}).createMachine({
  id: "ui",
  context: ({ input }) => ({
    localPlayerId: input.localPlayerId,
    gameId: input.gameId,
    reconnectToken: input.reconnectToken,
    currentGameState: undefined,
      isSidePanelOpen: false,
    reconnectionAttempts: 0,
      serverClockOffset: 0,
    lastStateReceivedAt: 0,
    modal: null,
    pendingActionSince: null,
    coldStartPhase: "silent",
  }),
  initial: "initializing",
  on: {
    _SESSION_ESTABLISHED: {
      target: ".inGame",
      actions: [
        "dismissModal",
        "setGameIdAndPlayerId",
        "setCurrentGameState",
        "persistSession",
        emit(({ event }) => ({
          type: "NAVIGATE",
          path: `/game/${event.response.gameId}`,
        })),
      ],
    },
    ERROR_RECEIVED: { actions: "showErrorToast" },
    _COLD_START_WAKING: {
      actions: assign({ coldStartPhase: "waking" as const }),
    },
    _COLD_START_EXPLAINING: {
      actions: assign({ coldStartPhase: "explaining" as const }),
    },
    // The bridge refused to put a move on a dead socket. Clear the in-flight
    // state now rather than letting the action bar grey out for its full
    // unstick delay over a move that was never sent.
    ACTION_NOT_SENT: {
      actions: [
        assign({ pendingActionSince: null }),
        () =>
          toast.error("Move not sent", {
            description:
              "You are not connected right now. Try again in a moment.",
          }),
      ],
    },
  },
  states: {
    initializing: {
      entry: "logInitializing",
      always: [
        {
          target: "inGame.promptToJoin",
          guard: ({ context }) => !!context.gameId && !context.localPlayerId,
          description: "Has a game ID from URL, but no player ID from session.",
          actions: "logToPromptToJoin",
        },
        {
          target: "inGame.disconnected",
          guard: ({ context }) => !!context.localPlayerId,
          description: "Has a stored session; attempt an automatic rejoin.",
          actions: "logToReconnecting",
        },
        { target: "outOfGame", actions: "logToOutOfGame" },
      ],
    },
    outOfGame: {
      id: "outOfGame",
      initial: "idle",
      states: {
        idle: { tags: ["idle"] },
        creatingGame: {
          tags: ["loading"],
          entry: "armColdStartPhases",
          exit: "disarmColdStartPhases",
          invoke: {
            src: "createGame",
            input: ({ event }) => {
              assertEvent(event, "CREATE_GAME_REQUESTED");
              return { name: event.playerName, botDifficulty: event.botDifficulty };
            },
            onDone: {
              target: "idle",
              actions: raise(({ event }) => ({
                type: "_SESSION_ESTABLISHED",
                response: event.output,
              })),
            },
            onError: {
              target: "idle",
              actions: ({ event }) =>
                toast.error("Failed to create game", {
                  description: (event.error as Error).message,
                }),
            },
          },
        },
        joiningGame: {
          tags: ["loading"],
          entry: "armColdStartPhases",
          exit: "disarmColdStartPhases",
          invoke: {
            src: "joinGame",
            input: ({ event }) => {
              assertEvent(event, "JOIN_GAME_REQUESTED");
              return { gameId: event.gameId, name: event.playerName };
            },
            onDone: {
              target: "idle",
              actions: [
                "logSessionEstablished",
                raise(({ event }) => ({
                  type: "_SESSION_ESTABLISHED",
                  response: event.output,
                })),
              ],
            },
            onError: {
              target: "idle",
              actions: ({ event }) =>
                toast.error("Failed to join game", {
                  description: (event.error as Error).message,
                }),
            },
          },
        },
      },
      on: {
        CREATE_GAME_REQUESTED: { target: ".creatingGame" },
        JOIN_GAME_REQUESTED: { target: ".joiningGame" },
      },
    },
    inGame: {
      id: "inGame",
      initial: "routing",
      on: {
        // Creating or joining a new game while an old session is still live in
        // this tab (e.g. the user navigated back to the landing page without
        // leaving) auto-abandons the old game: tell the server we left, clear
        // the stored session, then run the normal create/join flow.
        // promptToJoin/joiningGame define their own JOIN_GAME_REQUESTED which
        // takes precedence, so the no-session join prompt is unaffected.
        CREATE_GAME_REQUESTED: {
          target: "#outOfGame.creatingGame",
          actions: ["emitLeaveGame", "resetGameContext", "clearSession"],
        },
        JOIN_GAME_REQUESTED: {
          target: "#outOfGame.joiningGame",
          actions: ["emitLeaveGame", "resetGameContext", "clearSession"],
        },
        LEAVE_GAME: { target: ".leaving" },
        TOGGLE_SIDE_PANEL: { actions: "toggleSidePanel" },
        CLIENT_GAME_STATE_UPDATED: {
          target: ".routing",
          actions: "setCurrentGameState",
        },
        INITIAL_LOGS_RECEIVED: { actions: "setInitialLogs" },
        NEW_GAME_LOG: { actions: "addGameLog" },
        NEW_CHAT_MESSAGE: { actions: "addChatMessage" },
        SUBMIT_CHAT_MESSAGE: { actions: "emitChatMessage" },
        START_GAME: { actions: ["markActionPending", "emitPlayerAction"] },
        DECLARE_LOBBY_READY: {
          actions: ["markActionPending", "emitPlayerAction"],
        },
        DECLARE_LOBBY_UNREADY: {
          actions: ["markActionPending", "emitPlayerAction"],
        },
        REMOVE_PLAYER: { actions: ["markActionPending", "emitPlayerAction"] },
        CLAIM_SEAT: { actions: ["markActionPending", "emitPlayerAction"] },
        SET_BOT_DIFFICULTY: {
          actions: ["markActionPending", "emitPlayerAction"],
        },
        // The whole turn, and the only in-game move there is.
        THROW_CARD: { actions: ["markActionPending", "emitPlayerAction"] },
        PLAY_AGAIN: { actions: ["markActionPending", "emitPlayerAction"] },
        // Advisory rematch toggle — no markActionPending so it stays snappy and
        // re-toggleable while the server echoes the tally back.
        REQUEST_PLAY_AGAIN: { actions: "emitPlayerAction" },
        DISMISS_MODAL: { actions: "dismissModal" },
        DISCONNECT: { target: ".disconnected" },
        // A move nobody answered means the board is dead even though the
        // socket still claims otherwise. Re-run the handshake instead of
        // leaving the player pressing a button that does nothing. Guarded on
        // the CURRENT wait so a stale timer from an answered move cannot fire.
        ACTION_UNANSWERED: {
          target: ".reconnecting",
          guard: ({ context }) =>
            context.pendingActionSince !== null &&
            Date.now() - context.pendingActionSince >= ACTION_ANSWER_TIMEOUT_MS,
        },
        // Reachable from every game view, not just the lobby, so a player who
        // can see something is wrong is never told to reload the page.
        RETRY_REJOIN: { target: ".reconnecting" },
        // The server only sends this to a socket that is still open, so it
        // always means a second client took the seat rather than a reconnect
        // after a drop. Handled here rather than per state because it can
        // arrive during any of them.
        SEAT_CLAIMED_ELSEWHERE: { target: ".seatClaimedElsewhere" },
      },
      states: {
        routing: {
          always: [
            {
              target: "lobby",
              guard: ({ context }) =>
                context.currentGameState?.gameStage ===
                GameStage.WAITING_FOR_PLAYERS,
            },
            {
              target: "dealing",
              guard: ({ context }) =>
                context.currentGameState?.gameStage === GameStage.DEALING,
            },
            {
              target: "playing",
              guard: ({ context }) =>
                context.currentGameState?.gameStage === GameStage.PLAYING,
            },
            {
              target: "scoring",
              guard: ({ context }) =>
                context.currentGameState?.gameStage === GameStage.SCORING,
            },
            {
              target: "gameover",
              guard: ({ context }) =>
                context.currentGameState?.gameStage === GameStage.GAMEOVER,
            },
            {
              target: "#outOfGame",
              actions: () =>
                logger.warn(
                  "Routing fallback: no matching game state, returning to outOfGame.",
                ),
            },
          ],
        },
        lobby: {
          // dismissModal: belt-and-braces — GameUI pins the view to the join
          // modal whenever context.modal is set, so a stale modal must never
          // survive into the lobby.
          entry: ["log_ENTER_LOBBY", "dismissModal"],
          tags: ["lobby", "playing"],
          on: {
            // Manual "refresh" from the lobby re-runs the rejoin handshake to
            // re-sync state with the server.
            RETRY_REJOIN: { target: "reconnecting" },
          },
        },
        dealing: {
          tags: ["playing"],
        },
        playing: {
          tags: ["playing"],
          entry: "log_ENTER_GAME_BOARD",
        },
        scoring: { entry: "log_ENTER_SCORING", tags: ["scoring", "playing"] },
        gameover: {
          entry: "log_ENTER_GAMEOVER",
          tags: ["gameover", "playing"],
        },
        leaving: {
          entry: [
            "emitLeaveGame",
            "resetGameContext",
            "clearSession",
            "redirectToHome",
          ],
        },
        disconnected: {
          tags: ["recovering"],
          entry: "incrementReconnectionAttemptsAndScheduleRetry",
          on: {
            CONNECT: [
              {
                // No session to rejoin with (e.g. the join prompt) — just
                // resume routing instead of invoking a doomed rejoin.
                target: "routing",
                guard: ({ context }) => !context.localPlayerId,
                actions: "resetReconnectionAttempts",
              },
              // Always re-run the rejoin handshake — even when socket.io
              // connection-state recovery succeeded (recovered === true).
              // The server deletes the socket session on disconnect and marks
              // the player disconnected; a recovered socket that skips
              // ATTEMPT_REJOIN has no server-side session, so every action it
              // sends is silently dropped and broadcasts skip it — the exact
              // "joined back but frozen board" hardstuck. Rejoining is
              // idempotent and cheap.
              { target: "reconnecting" },
            ],
            RETRY_REJOIN: { target: "reconnecting" },
          },
        },
        reconnecting: {
          tags: ["recovering", "loading"],
          invoke: {
            src: "rejoinAndPoll",
            input: ({ context }) => ({
              gameId: context.gameId!,
              playerId: context.localPlayerId!,
              token: context.reconnectToken,
            }),
            onDone: {
              target: "routing",
              actions: [
                assign({
                  currentGameState: ({ event }) => event.output.gameState,
                  serverClockOffset: ({ event, context }) =>
                    adoptServerClockOffset(
                      context.serverClockOffset,
                      event.output.gameState?.serverNow,
                    ),
                  reconnectionAttempts: 0,
                                }),
                enqueueActions(({ event, enqueue }) => {
                  if (event.output.logs && event.output.logs.length > 0) {
                    enqueue.raise({
                      type: "INITIAL_LOGS_RECEIVED",
                      logs: event.output.logs,
                    });
                  }
                }),
              ],
            },
            onError: [
              {
                // The game (or this player's seat) no longer exists on the
                // server — retrying forever would loop, so clear the session.
                target: "recoveryFailed",
                guard: ({ event }) =>
                  ((event.error as Error)?.message ?? "")
                    .toLowerCase()
                    .includes("not found"),
              },
              { target: "disconnected" },
            ],
          },
        },
        // Another client holds the seat. Deliberately terminal: the watchdog
        // below would otherwise re-run the handshake eight seconds after the
        // last unanswered action and take the seat back with nobody asking,
        // which is how two windows end up trading it. Nulling
        // pendingActionSince is what disarms it, since ACTION_UNANSWERED is
        // guarded on that field rather than cancelled by id.
        //
        // The session is kept, not cleared: RETRY_REJOIN needs the token, and
        // taking the seat back is a decision for the player rather than a
        // timer.
        seatClaimedElsewhere: {
          entry: assign({ pendingActionSince: null }),
          on: {
            RETRY_REJOIN: { target: "reconnecting" },
          },
        },
        recoveryFailed: {
          entry: [
            "clearSession",
            () =>
              toast.error("Could not rejoin", {
                description: "That game is no longer available.",
              }),
            // Navigate rather than reload, so the explanation survives the trip.
            emit(() => ({ type: "NAVIGATE" as const, path: "/" })),
          ],
        },
        promptToJoin: {
          tags: ["prompting"],
          entry: assign({
            modal: {
              type: "rejoin" as const,
              title: "Join Game",
              message:
                "You have been invited to a game. Please enter your name to join.",
            },
          }),
          always: [
            {
              target: "routing",
              guard: ({ context }) => !!context.currentGameState,
            },
          ],
          on: {
            JOIN_GAME_REQUESTED: {
              target: "joiningGame",
              actions: "logJoiningGame",
            },
          },
        },
        joiningGame: {
          tags: ["loading"],
          entry: "armColdStartPhases",
          exit: "disarmColdStartPhases",
          // The server broadcasts the post-join state BEFORE the join ack
          // reaches this client (the machine's broadcast is emitted
          // synchronously inside the join send). The inGame-level handler
          // for this event targets .routing, which would cancel this invoke
          // and discard the ack — _SESSION_ESTABLISHED (persistSession +
          // dismissModal) would never run and the join modal never leaves
          // the screen. Store the state here without transitioning; the ack
          // then completes the session and routes.
          on: {
            CLIENT_GAME_STATE_UPDATED: {
              actions: "setCurrentGameState",
            },
          },
          invoke: {
            src: "joinGame",
            input: ({ event }) => {
              assertEvent(event, "JOIN_GAME_REQUESTED");
              return { gameId: event.gameId, name: event.playerName };
            },
            onDone: {
              actions: [
                "logSessionEstablished",
                raise(({ event }) => ({
                  type: "_SESSION_ESTABLISHED",
                  response: event.output,
                })),
              ],
            },
            onError: {
              target: "promptToJoin",
              actions: ({ event }) =>
                toast.error("Failed to join game", {
                  description: (event.error as Error).message,
                }),
            },
          },
        },
      },
    },
  },
});

export type UIMachineActorRef = ActorRefFrom<typeof uiMachine>;
export type UIMachineState = SnapshotFrom<typeof uiMachine>;
export type UIMachineSnapshot = StateFrom<typeof uiMachine>;
