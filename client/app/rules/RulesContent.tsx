"use client";

import Link from "next/link";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { ReactNode } from "react";
import {
  CaptureDiagram,
  CardValuesStrip,
  RiskDiagram,
  SeatingDiagram,
} from "./illustrations";

// One quiet fade-up for every reveal. The variants carry no `ease`/`type`
// fields; the transition sits on the element so a per-instance delay can
// override it without fighting a variant-level transition.
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const REVEAL_VIEWPORT = { once: true, amount: 0.2 } as const;
const REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-ring";

type SectionMeta = { id: string; num: string; title: string; short?: string };

const SECTIONS: SectionMeta[] = [
  { id: "goal", num: "01", title: "The goal" },
  {
    id: "card-values",
    num: "02",
    title: "The deck and card values",
    short: "Card values",
  },
  { id: "the-table", num: "03", title: "The table and the teams", short: "The table" },
  { id: "setup", num: "04", title: "Setup" },
  { id: "your-turn", num: "05", title: "Your turn" },
  { id: "capturing", num: "06", title: "Capturing the stack", short: "Capturing" },
  { id: "risk", num: "07", title: "What makes it hard", short: "The risk" },
  { id: "scoring", num: "08", title: "Scoring" },
  { id: "ending", num: "09", title: "How a hand ends" },
  { id: "bots", num: "10", title: "Bots and fine print", short: "Bots" },
];

const sec = (id: string): SectionMeta => SECTIONS.find((s) => s.id === id)!;

const Reveal = ({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    className={className}
    variants={revealVariants}
    initial="hidden"
    whileInView="visible"
    viewport={REVEAL_VIEWPORT}
    transition={{ duration: 0.5, ease: REVEAL_EASE, delay }}
  >
    {children}
  </motion.div>
);

/** Key terms read in ink against the muted body text. */
const Term = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-ink">{children}</strong>
);

const MetaChip = ({ children }: { children: ReactNode }) => (
  <span className="rounded-full border border-hairline bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
    {children}
  </span>
);

const RuleSection = ({
  meta,
  figure,
  children,
}: {
  meta: SectionMeta;
  figure?: ReactNode;
  children: ReactNode;
}) => (
  <motion.section
    id={meta.id}
    className="scroll-mt-24 border-t border-hairline py-10 sm:py-14"
    variants={revealVariants}
    initial="hidden"
    whileInView="visible"
    viewport={REVEAL_VIEWPORT}
    transition={{ duration: 0.5, ease: REVEAL_EASE }}
  >
    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
      {meta.num}
    </p>
    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
      {meta.title}
    </h2>
    <div className="mt-4 max-w-2xl space-y-4 text-[15px] leading-relaxed text-ink-muted sm:text-base">
      {children}
    </div>
    {figure && <div className="mt-8">{figure}</div>}
  </motion.section>
);

const OptionPanel = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="rounded-card border border-hairline p-5">
    <h3 className="text-sm font-bold text-ink">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</p>
  </div>
);

export default function RulesContent() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-ground font-game text-ink">
        <header className="sticky top-0 z-20 border-b border-hairline bg-ground">
          <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-5 sm:px-8">
            <Link
              href="/"
              data-cursor-link
              className={`group flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 ${FOCUS_RING}`}
            >
              <ChevronLeft className="h-4 w-4 text-ink-muted transition-colors group-hover:text-ink" />
              <span className="text-lg font-bold tracking-tight text-ink">
                Split 13
              </span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl px-5 sm:px-8">
          <div className="pb-4 pt-12 sm:pt-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              How to play
            </p>
            <h1 className="mt-3 text-5xl font-extrabold tracking-tight sm:text-6xl">
              Rules
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
              Split 13 is a partnership game about a growing pot. Nothing is
              hidden from you but the other three hands, and every card you
              throw is a bet on who takes the pile.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <MetaChip>4 players, 2 teams</MetaChip>
              <MetaChip>52 cards, 13 each</MetaChip>
              <MetaChip>20s a turn</MetaChip>
            </div>

            <nav
              aria-label="Contents"
              className="mt-12 border-t border-hairline pt-6"
            >
              <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    data-cursor-link
                    className={`flex items-baseline gap-2 rounded-sm py-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink ${FOCUS_RING}`}
                  >
                    <span className="text-xs tabular-nums">{s.num}</span>
                    {s.short ?? s.title}
                  </a>
                ))}
              </div>
            </nav>
          </div>

          <RuleSection meta={sec("goal")}>
            <p>
              Four players sit as <Term>two teams of two</Term>. Cards thrown on
              the table pile up into a stack, and matching the card on top of it
              takes the whole pile for your team.
            </p>
            <p>
              When every card has been thrown, the team that captured the most{" "}
              <Term>points</Term> wins the hand. Equal totals is a draw.
            </p>
          </RuleSection>

          <RuleSection meta={sec("card-values")} figure={<CardValuesStrip />}>
            <p>
              A standard 52-card deck, no jokers. <Term>Aces are worth 20</Term>
              , far more than anything else. <Term>Tens and the picture cards</Term>{" "}
              are worth 10 each, and <Term>everything from 2 to 9</Term> is worth
              5.
            </p>
            <p>
              That puts 400 points in the deck, and it is why an Ace on the table
              changes a hand: one card can be worth four of the small ones.
            </p>
          </RuleSection>

          <RuleSection meta={sec("the-table")} figure={<SeatingDiagram />}>
            <p>
              Always <Term>four seats</Term>. Seats 1 and 3 are Team A, seats 2
              and 4 are Team B, so your partner sits opposite you and an opponent
              sits on either side.
            </p>
            <p>
              You pick your seat in the lobby, and the seat decides your team.
              Once the host starts the game, <Term>seats are locked</Term> for
              the life of the room.
            </p>
            <p>
              You do not need three friends. Any seat nobody takes is filled by a
              bot, so one player and three bots is a real game.
            </p>
          </RuleSection>

          <RuleSection meta={sec("setup")}>
            <p>
              The deck is shuffled and dealt out entirely:{" "}
              <Term>thirteen cards each</Term>, nothing held back and no draw
              pile. You see your own hand, sorted by rank, for the whole hand.
              You never see anyone else&rsquo;s.
            </p>
            <p>
              One seat is picked at random to go first. After that, play moves
              clockwise, which — because the seats alternate — means the turn
              order runs A, B, A, B all the way round.
            </p>
          </RuleSection>

          <RuleSection meta={sec("your-turn")}>
            <p>
              On your turn you throw <Term>exactly one card</Term>, face up, onto
              the table stack. That is the whole turn. There is nothing to draw,
              nothing to swap and nothing to declare.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <OptionPanel title="Your card matches the top">
                You capture. The stack is yours — see below.
              </OptionPanel>
              <OptionPanel title="It doesn&rsquo;t match">
                Your card becomes the new top of the stack, and the turn passes.
              </OptionPanel>
            </div>
            <p>
              Every turn is clocked at <Term>20 seconds</Term>, and the timer is
              visible to everyone. If it runs out, the server throws a random
              card from your hand for you — and if that card happens to match,
              it captures like any other.
            </p>
          </RuleSection>

          <RuleSection meta={sec("capturing")} figure={<CaptureDiagram />}>
            <p>
              A capture needs the <Term>same rank</Term>, in any suit: any 7
              takes a 7. Suits never matter in this game.
            </p>
            <p>
              You take <Term>the entire stack</Term> — every card thrown since
              the last capture, not just the pair — and it goes to your team&rsquo;s
              pile. The table is left completely empty, so the next player starts
              a fresh stack and cannot capture anything.
            </p>
            <p>
              Capturing <Term>ends your turn</Term>. There is no bonus throw.
            </p>
          </RuleSection>

          <RuleSection meta={sec("risk")} figure={<RiskDiagram />}>
            <p>
              Here is the whole difficulty. When you cannot capture, you still
              have to throw something — and whatever you throw makes the stack{" "}
              <Term>worth more to whoever takes it next</Term>.
            </p>
            <p>
              The seat after yours always belongs to the other team. So throwing
              your Ace into a fat stack is handing an opponent 20 points if they
              can match it, and holding it means you are still carrying it when
              the cards run out.
            </p>
            <p>
              The table shows the stack&rsquo;s running value for exactly this
              reason: it is the number the decision turns on.
            </p>
          </RuleSection>

          <RuleSection meta={sec("scoring")}>
            <p>
              Scoring is <Term>per team</Term>, never per player. Anything you
              capture and anything your partner captures land in the same pile,
              and both scores update the moment a capture happens.
            </p>
            <p>
              Every card in a captured stack counts, not just the one that
              triggered it.
            </p>
          </RuleSection>

          <RuleSection meta={sec("ending")}>
            <p>
              The hand ends the moment all four players have thrown all thirteen
              of their cards — 52 throws, thirteen times round the table.
            </p>
            <p>
              Whatever is <Term>still sitting on the table</Term> was thrown but
              never matched. It is discarded, and scores for nobody. Those are
              real points that simply leave the game, which is why the last few
              throws matter more than they look.
            </p>
            <p>
              Higher team total wins the hand.{" "}
              <Term>Equal totals is a draw</Term> — no sudden death, no tiebreak.
            </p>
          </RuleSection>

          <RuleSection meta={sec("bots")}>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-ink">Bot difficulty</dt>
                <dd className="mt-1">
                  Set once per room by the host. <Term>Easy</Term> throws at
                  random. <Term>Normal</Term> captures whenever it can, then
                  throws its cheapest card. <Term>Hard</Term> also tracks which
                  ranks are used up, so it knows which of its cards nobody can
                  match any more and dumps the expensive ones then.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">If someone leaves</dt>
                <dd className="mt-1">
                  A bot takes the seat and the hand carries on. An empty seat
                  would be a turn nobody could take.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Playing again</dt>
                <dd className="mt-1">
                  The host deals another hand into the same room. Seats, teams
                  and the running tally of hands won all stay as they are.
                </dd>
              </div>
            </dl>
          </RuleSection>

          <Reveal>
            <div className="border-t border-hairline py-16 text-center sm:py-24">
              <p className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Ready?
              </p>
              <p className="mt-2 text-ink-muted">Take the pile.</p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/"
                  data-cursor-link
                  className={`flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-8 text-base font-bold text-accent-ink transition-colors hover:bg-accent/90 ${FOCUS_RING}`}
                >
                  Play a hand
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </main>

        <footer className="border-t border-hairline">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-2 px-5 py-8 text-xs text-ink-muted sm:flex-row sm:px-8">
            <span>© {new Date().getFullYear()} Split 13</span>
            <a
              href="https://github.com/AliArfa852/split13-card-game/blob/main/docs/GAME_RULES.md"
              target="_blank"
              rel="noreferrer"
              data-cursor-link
              className={`rounded-sm underline underline-offset-4 transition-colors hover:text-ink ${FOCUS_RING}`}
            >
              Full rulebook on GitHub
            </a>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
