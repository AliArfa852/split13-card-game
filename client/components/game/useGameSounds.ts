"use client";

import { useEffect, useRef } from "react";
import { GameStage } from "shared-types";
import { useUISelector, type UIMachineSnapshot } from "@/context/GameUIContext";
import { initSounds, play } from "@/lib/sounds";

// The capture pulse fires when the card lands (cardTravelTransition = 0.65s);
// the capture sound lands with it.
const CAPTURE_FLIGHT_MS = 650;
// How long before your own turn expires the clock starts ticking at you.
const TIMER_TAIL_LEAD_MS = 5000;

/** Primitive signals only, so the selector stays shallow-comparable. */
const selectSoundSignals = (state: UIMachineSnapshot) => {
  const gs = state.context.currentGameState;
  const players = Object.values(gs?.players ?? {});
  const isMyTurn =
    !!gs?.currentPlayerId && gs.currentPlayerId === state.context.localPlayerId;
  return {
    gameStage: gs?.gameStage ?? null,
    stackSize: gs?.stack.length ?? 0,
    // One capture is one timestamp, so this changes exactly once per capture.
    lastCaptureAt: gs?.lastCapture?.occurredAt ?? null,
    isMyTurn,
    // Only armed for your own turn: a tick for someone else's clock would be
    // three quarters of the table's turns.
    myTurnDeadline: isMyTurn ? (gs?.turnDeadline ?? null) : null,
    serverClockOffset: state.context.serverClockOffset,
    chatCount: gs?.chat?.length ?? 0,
    isSidePanelOpen: state.context.isSidePanelOpen,
    playerCount: players.length,
    readyCount: players.filter((p) => p.isReady).length,
  };
};

/** Fire `onChange` on every change AFTER the first observed value — the
 *  stamp components' "first sight is history" rule, as a hook. */
function useDelta<T>(value: T, onChange: (prev: T, next: T) => void) {
  const prevRef = useRef<T | null>(null);
  const initRef = useRef(false);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      prevRef.current = value;
      return;
    }
    const prev = prevRef.current as T;
    if (!Object.is(prev, value)) {
      prevRef.current = value;
      cbRef.current(prev, value);
    }
  }, [value]);
}

/** Mounted once in GameUI. Every trigger maps a broadcast delta the visual
 *  system already reacts to onto one sprite. */
export function useGameSounds() {
  const s = useUISelector(selectSoundSignals);

  useEffect(() => {
    initSounds();
  }, []);

  useDelta(s.gameStage, (prev, next) => {
    // Start = leaving the lobby; the riffle plays when the cards actually fly
    // (DEALING -> PLAYING is the commit that animates).
    if (prev === GameStage.WAITING_FOR_PLAYERS && next === GameStage.DEALING)
      play("start");
    if (prev === GameStage.DEALING && next === GameStage.PLAYING) play("deal");
    const wasEnd = prev === GameStage.SCORING || prev === GameStage.GAMEOVER;
    const isEnd = next === GameStage.SCORING || next === GameStage.GAMEOVER;
    if (isEnd && !wasEnd) play("roundOver");
  });

  useDelta(s.playerCount, (prev, next) => {
    if (s.gameStage !== GameStage.WAITING_FOR_PLAYERS) return;
    if (next > prev) play("join");
    if (next < prev) play("leave");
  });

  useDelta(s.readyCount, (prev, next) => {
    if (s.gameStage !== GameStage.WAITING_FOR_PLAYERS) return;
    if (next > prev) play("ready");
    if (next < prev) play("unready");
  });

  // A throw that does not capture only ever grows the stack, so this is the
  // "card lands on the pile" cue. A capture empties it and is handled below,
  // which is why this is a > and not a !==.
  useDelta(s.stackSize, (prev, next) => {
    if (next > prev) play("place");
  });

  useDelta(s.lastCaptureAt, (_prev, next) => {
    // Fire-and-forget: the sound lands with the card (0.65s flight). A stray
    // play after unmount is harmless (module-level audio).
    if (next) setTimeout(() => play("capture"), CAPTURE_FLIGHT_MS);
  });

  useDelta(s.isMyTurn, (prev, next) => {
    if (!prev && next) play("yourTurn");
  });

  // The 20s turn clock, audible only in its last few seconds and only for
  // your own turn. Scheduled off the server's deadline rather than a local
  // countdown so it cannot drift away from the bar the player is watching.
  useEffect(() => {
    if (!s.myTurnDeadline) return;
    const fireAt =
      s.myTurnDeadline - s.serverClockOffset - TIMER_TAIL_LEAD_MS - Date.now();
    if (fireAt <= 0) return;
    const id = setTimeout(() => play("timerTail"), fireAt);
    return () => clearTimeout(id);
  }, [s.myTurnDeadline, s.serverClockOffset]);

  useDelta(s.chatCount, (prev, next) => {
    if (next > prev && !s.isSidePanelOpen) play("chat");
  });
}
