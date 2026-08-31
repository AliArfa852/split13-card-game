"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { CARD_RING_GEOMETRY } from "@/components/cards/cardRing";
import { CardRank, Suit, type Card } from "shared-types";
import { ArrowRight } from "lucide-react";

const card = (id: string, suit: Suit, rank: CardRank): Card => ({
  id,
  suit,
  rank,
});

type SizedCardProps = ComponentProps<typeof PlayingCard> & {
  overlay?: ReactNode;
};

/** PlayingCard sizes its face type with container queries, so it needs a
 *  wrapper with real dimensions — the board's `w-* aspect-[5/7]` idiom. The
 *  overlay slot holds rings and chips above the card, exactly as in play. */
const SizedCard = ({ overlay, className, ...cardProps }: SizedCardProps) => (
  <div className={cn("relative w-14 aspect-[5/7] sm:w-16", className)}>
    <PlayingCard {...cardProps} className="h-full w-full" />
    {overlay}
  </div>
);

/** The informational ring — ink, never accent (accent means "yours to act
 *  on" at the table; these figures only inform). */
const InkRing = ({ children }: { children?: ReactNode }) => (
  <div className={cn(CARD_RING_GEOMETRY, "ring-[2px] ring-ink")}>
    {children}
  </div>
);

const Figure = ({
  label,
  caption,
  children,
  className,
}: {
  label: string;
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <figure
    className={cn("rounded-card border border-hairline p-5 sm:p-6", className)}
  >
    <div role="img" aria-label={label}>
      {children}
    </div>
    {caption && (
      <figcaption className="mt-4 text-center text-xs font-semibold text-ink-muted">
        {caption}
      </figcaption>
    )}
  </figure>
);

const Pile = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col items-center gap-2">
    {children}
    <span className="text-xs font-semibold text-ink-muted">{label}</span>
  </div>
);

const StepChip = ({ children }: { children: ReactNode }) => (
  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-[11px] font-bold text-ink">
    {children}
  </span>
);

// ---------------------------------------------------------------------------

const VALUE_CARDS: { c: Card; points: string }[] = [
  { c: card("rules-value-AS", Suit.Spades, CardRank.Ace), points: "20" },
  { c: card("rules-value-7H", Suit.Hearts, CardRank.Seven), points: "5" },
  { c: card("rules-value-TC", Suit.Clubs, CardRank.Ten), points: "10" },
  { c: card("rules-value-QD", Suit.Diamonds, CardRank.Queen), points: "10" },
  { c: card("rules-value-KS", Suit.Spades, CardRank.King), points: "10" },
];

export const CardValuesStrip = () => (
  <Figure
    label="Card values: ace scores twenty, seven scores five, ten, queen and king score ten each"
    caption="Aces are worth the most by far. Everything under 10 is worth 5."
  >
    <div className="flex items-start justify-center gap-2 sm:gap-4">
      {VALUE_CARDS.map(({ c, points }) => (
        <div key={c.id} className="flex flex-col items-center gap-2">
          <SizedCard card={c} className="w-12 sm:w-16" />
          <span className="text-sm font-bold text-ink">{points}</span>
        </div>
      ))}
    </div>
  </Figure>
);

const SEATS = [
  { seat: 1, team: "A" },
  { seat: 2, team: "B" },
  { seat: 3, team: "A" },
  { seat: 4, team: "B" },
] as const;

/** Why the turn order needs no rule of its own: seats alternate team, so
 *  going round the table clockwise already alternates A and B. */
export const SeatingDiagram = () => (
  <Figure
    label="Four seats round a table. Seats one and three are Team A, seats two and four are Team B, and play moves clockwise."
    caption="Play moves clockwise, so the seat after yours is always an opponent and the seat opposite is always your partner."
  >
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {SEATS.map(({ seat, team }, i) => (
        <div key={seat} className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-extrabold sm:h-14 sm:w-14",
                team === "A"
                  ? "border-team-a text-team-a"
                  : "border-team-b text-team-b",
              )}
            >
              {seat}
            </span>
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-widest",
                team === "A" ? "text-team-a" : "text-team-b",
              )}
            >
              Team {team}
            </span>
          </div>
          {i < SEATS.length - 1 && (
            <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
          )}
        </div>
      ))}
    </div>
  </Figure>
);

const STACK_BEFORE: Card[] = [
  card("rules-stack-4D", Suit.Diamonds, CardRank.Four),
  card("rules-stack-KC", Suit.Clubs, CardRank.King),
  card("rules-stack-7S", Suit.Spades, CardRank.Seven),
];
const MATCHING_CARD = card("rules-stack-7H", Suit.Hearts, CardRank.Seven);

/** The whole game in one figure: match the top card, take everything under it. */
export const CaptureDiagram = () => (
  <Figure
    label="A stack of three cards with a seven on top. Playing another seven takes all four cards."
    caption="A capture takes the whole stack, not just the pair — and leaves the table empty."
  >
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
      <Pile label="On the table · 20 pts">
        <div className="relative h-[4.9rem] w-14 sm:h-[5.6rem] sm:w-16">
          {STACK_BEFORE.map((c, i) => (
            <div
              key={c.id}
              className="absolute inset-0"
              style={{
                zIndex: i,
                transform: `translate(${(STACK_BEFORE.length - 1 - i) * -4}px, ${
                  (STACK_BEFORE.length - 1 - i) * -4
                }px)`,
              }}
            >
              <SizedCard card={c} className="w-14 sm:w-16" />
            </div>
          ))}
        </div>
      </Pile>

      <div className="flex flex-col items-center gap-1">
        <ArrowRight className="h-5 w-5 text-ink-muted" />
        <span className="text-[11px] font-semibold text-ink-muted">
          you throw
        </span>
      </div>

      <Pile label="Matches the 7">
        <SizedCard
          card={MATCHING_CARD}
          className="w-14 sm:w-16"
          overlay={<InkRing />}
        />
      </Pile>

      <div className="flex flex-col items-center gap-1">
        <ArrowRight className="h-5 w-5 text-ink-muted" />
        <span className="text-[11px] font-semibold text-ink-muted">
          you take
        </span>
      </div>

      <Pile label="Your team · 25 pts">
        <div className="flex items-center">
          {[...STACK_BEFORE, MATCHING_CARD].map((c, i) => (
            <div key={c.id} className={cn(i > 0 && "-ml-9 sm:-ml-10")}>
              <SizedCard card={c} className="w-14 sm:w-16" />
            </div>
          ))}
        </div>
      </Pile>
    </div>
  </Figure>
);

/** What a turn costs you when you cannot capture: the pot grows, and the
 *  next player is on the other team. */
export const RiskDiagram = () => (
  <Figure
    label="Three steps: a stack worth ten, a king added to make it twenty, and an opponent capturing all of it."
    caption="Every card you cannot capture with makes the stack worth more to whoever does."
  >
    <div className="mx-auto flex max-w-md flex-col gap-3">
      {[
        { n: "1", text: "The stack is worth 10. You hold no matching card." },
        { n: "2", text: "You throw a King. The stack is now worth 20." },
        {
          n: "3",
          text: "The next player matches it and takes all 20 for their team.",
        },
      ].map(({ n, text }) => (
        <div key={n} className="flex items-start gap-3">
          <StepChip>{n}</StepChip>
          <p className="text-sm leading-relaxed text-ink-muted">{text}</p>
        </div>
      ))}
    </div>
  </Figure>
);
