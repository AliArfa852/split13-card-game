import type { Metadata } from "next";
import RulesContent from "./RulesContent";

export const metadata: Metadata = {
  title: "How to play Split 13 - full rules and scoring",
  description:
    "The complete rules of Split 13: card values, seats and teams, setup, throwing to capture, the turn timer, and team scoring.",
  alternates: { canonical: "/rules" },
  openGraph: {
    title: "Rules · Split 13",
    description:
      "Learn Split 13 in five minutes: match the top card, take the pile, score for your team.",
    url: "/rules",
    type: "article",
  },
};

export default function RulesPage() {
  return <RulesContent />;
}
