// The canonical origin, in one place because three files need it absolute:
// the root metadataBase, the sitemap's entries and the robots sitemap line.
//
// Deliberately not read from the environment. A preview deployment should
// still declare production as canonical, and Next's fallback chain is what
// this exists to escape: with no metadataBase it resolves social images
// against VERCEL_URL, the per-deployment hostname, or localhost in a local
// build. Neither is a URL anyone shares.
// TODO: point this at your own deployment before sharing anything. Until it
// is right, every social card and sitemap entry names somebody else's site.
export const SITE_URL = "https://split-13.vercel.app";

// Read by the root description, the JSON-LD beside it and the manifest. Kept in
// one place because the manifest is the copy that quietly falls behind when it
// is not, and nothing about the site looks wrong when that happens.
export const SITE_DESCRIPTION =
  "Split 13 is a free online card game for one to four players in two teams of two, with bots filling any empty seat. The deck is split thirteen cards each; match the card on top of the table to capture the whole stack for your team.";
