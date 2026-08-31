"use client";

interface CardBackProps {
  /** When set (a stacked pile), the count renders instead of the mark. */
  count?: number;
}

export function CardBack({ count }: CardBackProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-card bg-accent @container/back">
      <span className="card-back-count font-game font-bold leading-none text-accent-ink">
        {typeof count === "number" ? count : 13}
      </span>
    </div>
  );
}
