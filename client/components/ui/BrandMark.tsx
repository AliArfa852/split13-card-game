import { cn } from "@/lib/utils";

/** The brand mark is the game's own material: a miniature accent card back
 *  carrying the number the game is named for, tilted like a card just placed
 *  on the table. Size it via className (height; width follows the 5:7 card
 *  aspect). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex aspect-[5/7] h-9 -rotate-6 items-center justify-center rounded-[5px] bg-accent font-game text-[0.6em] font-extrabold leading-none tracking-tight text-accent-ink shadow-sm",
        className,
      )}
    >
      13
    </span>
  );
}
