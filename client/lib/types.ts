import { Card } from "shared-types";

export function isCard(card: unknown): card is Card {
  return typeof card === "object" && card !== null && "rank" in card;
}
