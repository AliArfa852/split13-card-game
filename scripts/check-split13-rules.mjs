/**
 * Rules check for Split 13, run against the real game machine.
 *
 * Drives whole hands to completion and asserts the invariants docs/GAME_RULES
 * promises, then tests the scoring and tie branch directly, because an exact
 * tie is rare enough that a random sweep will not reliably produce one.
 *
 * Needs a built server: npm run build:server-deps
 * Run: npm run check:rules
 */
// Set before the machine module is loaded: it reads its delays from env at
// import time, and at the real 20s/1.1s pacing a single hand takes a minute.
// Dynamic imports below are what make this ordering possible.
process.env.TURN_TIMER_MS ??= "300";
process.env.BOT_THINK_MS ??= "1";
process.env.LOG_LEVEL ??= "silent";

const { createActor } = await import("xstate");
const {
  BotDifficulty,
  CardRank,
  FULL_DECK_POINTS,
  GameStage,
  PlayerActionType,
  SEAT_COUNT,
  Suit,
  Team,
} = await import("shared-types");
const { gameMachine, finishHand } = await import(
  "../server/dist/game-machine.js"
);
const { generatePlayerView } = await import(
  "../server/dist/state-redactor.js"
);

const HUMAN_ID = "human_1";
const HANDS_TO_SWEEP = 30;

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` ${detail}` : ""}`);
  }
};

const startedActor = (seed, difficulty) => {
  const actor = createActor(gameMachine, {
    input: { gameId: `chk${seed}`, seed, botDifficulty: difficulty },
  });
  actor.start();
  actor.send({
    type: "PLAYER_JOIN_REQUEST",
    playerId: HUMAN_ID,
    playerSetupData: {
      name: "Human",
      id: HUMAN_ID,
      socketId: "sock",
      seatIndex: 0,
    },
  });
  actor.send({ type: PlayerActionType.START_GAME, playerId: HUMAN_ID });
  return actor;
};

/** Plays one hand. With humanStalls the human never acts, so every one of
 *  their turns has to be carried by the turn timer instead. */
const playHand = async (seed, difficulty, { humanStalls = false } = {}) => {
  const actor = startedActor(seed, difficulty);
  const seatSequence = [];
  const captures = [];
  let stackClearedByEveryCapture = true;
  let lastCaptureAt = null;

  actor.subscribe((snapshot) => {
    const ctx = snapshot.context;

    if (ctx.lastCapture && ctx.lastCapture.occurredAt !== lastCaptureAt) {
      lastCaptureAt = ctx.lastCapture.occurredAt;
      captures.push({ ...ctx.lastCapture });
      if (ctx.stack.length !== 0) stackClearedByEveryCapture = false;
    }

    if (ctx.gameStage !== GameStage.PLAYING || ctx.currentSeat === null) return;
    if (seatSequence[seatSequence.length - 1] !== ctx.currentSeat) {
      seatSequence.push(ctx.currentSeat);
    }

    if (humanStalls || ctx.seats[ctx.currentSeat] !== HUMAN_ID) return;
    const hand = ctx.players[HUMAN_ID].hand;
    if (hand.length === 0) return;
    const top = ctx.stack[ctx.stack.length - 1] ?? null;
    const card = hand.find((c) => top && c.rank === top.rank) ?? hand[0];
    queueMicrotask(() =>
      actor.send({
        type: PlayerActionType.THROW_CARD,
        playerId: HUMAN_ID,
        payload: { cardId: card.id },
      }),
    );
  });

  const deadline = Date.now() + 60_000;
  while (
    actor.getSnapshot().context.gameStage !== GameStage.GAMEOVER &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  const ctx = actor.getSnapshot().context;
  actor.stop();
  return { ctx, seatSequence, captures, stackClearedByEveryCapture };
};

const assertHand = (label, hand, { verbose = true } = {}) => {
  const { ctx, seatSequence, captures, stackClearedByEveryCapture } = hand;
  const result = ctx.result;
  if (!check(`${label}: reached a result`, !!result) && !result) return;

  const a = result.teamScores[Team.A];
  const b = result.teamScores[Team.B];

  // The whole deck is dealt, so every point either lands in a team's pile or
  // is stranded on the table. Nothing else can absorb one.
  check(
    `${label}: points conserved`,
    a + b + result.strandedPoints === FULL_DECK_POINTS,
    `-> ${a} + ${b} + ${result.strandedPoints}`,
  );
  check(
    `${label}: cards conserved`,
    ctx.teamCardCounts[Team.A] +
      ctx.teamCardCounts[Team.B] +
      result.strandedCardCount ===
      52,
  );
  check(
    `${label}: every hand emptied`,
    Object.values(ctx.players).every((p) => p.hand.length === 0),
  );
  check(
    `${label}: exactly 52 throws`,
    seatSequence.length === 52,
    `-> ${seatSequence.length}`,
  );
  check(
    `${label}: capture always clears the table`,
    stackClearedByEveryCapture,
  );
  check(
    `${label}: turn order strictly clockwise`,
    seatSequence.every(
      (seat, i) => i === 0 || seat === (seatSequence[i - 1] + 1) % SEAT_COUNT,
    ),
  );
  // Seats alternate team by construction, so clockwise play must alternate too.
  check(
    `${label}: teams alternate A -> B -> A -> B`,
    seatSequence.every(
      (seat, i) => i === 0 || seat % 2 !== seatSequence[i - 1] % 2,
    ),
  );
  check(
    `${label}: draw flag matches the scores`,
    result.isDraw === (a === b) &&
      (result.isDraw ? result.winner === null : result.winner !== null),
  );
  check(
    `${label}: every capture took 2+ cards`,
    captures.every((c) => c.cardCount >= 2),
  );

  if (verbose) {
    console.log(
      `  ${label}: A ${a} / B ${b}` +
        `${result.isDraw ? " (draw)" : ` — Team ${result.winner}`}` +
        ` · ${captures.length} captures · ${result.strandedCardCount} stranded`,
    );
  }
};

const assertRedaction = async () => {
  const actor = startedActor(7, BotDifficulty.NORMAL);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const ctx = actor.getSnapshot().context;
  const view = generatePlayerView(actor.getSnapshot(), HUMAN_ID);

  check(
    "redaction: viewer sees their own hand",
    view.players[HUMAN_ID].hand !== null,
  );
  check(
    "redaction: viewer's hand matches their real hand",
    view.players[HUMAN_ID].hand.length === ctx.players[HUMAN_ID].hand.length,
  );

  const opponents = Object.values(view.players).filter(
    (p) => p.id !== HUMAN_ID,
  );
  // The single leak this whole function exists to prevent.
  check(
    "redaction: opponent hand CONTENTS are hidden",
    opponents.length === 3 && opponents.every((p) => p.hand === null),
  );
  check(
    "redaction: opponent card counts stay truthful",
    opponents.every(
      (p) => p.handCount === ctx.players[p.id].hand.length && p.handCount > 0,
    ),
  );
  check(
    "redaction: stack value is public",
    typeof view.stackValue === "number",
  );
  check("redaction: turn timer is public", view.turnTimerMs > 0);
  check(
    "redaction: four seats, all filled once started",
    view.seats.length === SEAT_COUNT && view.seats.every(Boolean),
  );
  check(
    "redaction: seats map to alternating teams",
    view.seats.every(
      (id, i) => view.players[id].team === (i % 2 === 0 ? Team.A : Team.B),
    ),
  );
  actor.stop();
};

/** Scoring and the tie branch, called directly: a random sweep will almost
 *  never land on an exact tie, and it is the outcome with no second chance. */
const assertScoring = () => {
  const ctx = (a, b, stack = []) => ({
    gameId: "score",
    players: {},
    seats: [null, null, null, null],
    hostId: null,
    gameStage: GameStage.PLAYING,
    currentSeat: 2,
    stack,
    teamScores: { [Team.A]: a, [Team.B]: b },
    teamCardCounts: { [Team.A]: 0, [Team.B]: 0 },
    lastCapture: null,
    playedRankCounts: {},
    botDifficulty: BotDifficulty.NORMAL,
    turnDeadline: 1,
    turnTimerMs: 20000,
    result: null,
    teamWins: { [Team.A]: 0, [Team.B]: 0 },
    rematchVotes: [],
    roundEpoch: 0,
    log: [],
    chat: [],
    errorState: null,
    rng: { float: () => 0, id: () => "x" },
  });

  const drawn = finishHand(ctx(200, 200));
  check("scoring: equal totals is a draw", drawn.result.isDraw === true);
  check("scoring: a draw has no winner", drawn.result.winner === null);
  check(
    "scoring: a draw credits neither team",
    drawn.teamWins[Team.A] === 0 && drawn.teamWins[Team.B] === 0,
  );
  check(
    "scoring: the hand's turn is cleared",
    drawn.currentSeat === null && drawn.turnDeadline === null,
  );

  const stranded = finishHand(
    ctx(150, 150, [
      { id: "1", suit: Suit.Hearts, rank: CardRank.Ace },
      { id: "2", suit: Suit.Spades, rank: CardRank.King },
    ]),
  );
  check(
    "scoring: a tie below 200 each is still a draw",
    stranded.result.isDraw === true,
  );
  check(
    "scoring: stranded cards counted",
    stranded.result.strandedCardCount === 2,
  );
  check(
    "scoring: stranded points counted",
    stranded.result.strandedPoints === 30,
  );

  const aWins = finishHand(ctx(240, 160));
  check("scoring: higher total wins (A)", aWins.result.winner === Team.A);
  check("scoring: the win is credited to A", aWins.teamWins[Team.A] === 1);
  const bWins = finishHand(ctx(10, 390));
  check("scoring: higher total wins (B)", bWins.result.winner === Team.B);
  check("scoring: the win is credited to B", bWins.teamWins[Team.B] === 1);
  const oneApart = finishHand(ctx(200, 199));
  check(
    "scoring: a one-point gap is decisive",
    oneApart.result.isDraw === false && oneApart.result.winner === Team.A,
  );
};

const main = async () => {
  console.log("Split 13 rules check\n");

  const difficulties = [
    BotDifficulty.EASY,
    BotDifficulty.NORMAL,
    BotDifficulty.HARD,
  ];
  for (let seed = 1; seed <= 4; seed++) {
    const difficulty = difficulties[seed % 3];
    assertHand(
      `seed ${seed} (${difficulty})`,
      await playHand(seed, difficulty),
    );
  }

  // Rules §5: a player who never acts must not stall the table.
  assertHand(
    "stalling human",
    await playHand(99, BotDifficulty.NORMAL, { humanStalls: true }),
  );

  process.stdout.write(`  sweeping ${HANDS_TO_SWEEP} hands...`);
  for (let seed = 100; seed < 100 + HANDS_TO_SWEEP; seed++) {
    assertHand(`sweep ${seed}`, await playHand(seed, difficulties[seed % 3]), {
      verbose: false,
    });
  }
  console.log(" done");

  await assertRedaction();
  assertScoring();

  console.log(
    failures === 0
      ? "\nAll rules checks passed."
      : `\n${failures} rules check(s) FAILED.`,
  );
  process.exit(failures === 0 ? 0 : 1);
};

main();
