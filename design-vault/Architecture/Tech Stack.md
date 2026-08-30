---
tags: [architecture]
---
Up: [[00 - Home]] · [[Architecture Overview]]

# Tech Stack

**Client** (`client/`): Next.js (App Router), TypeScript, XState + `@xstate/react`, Tailwind CSS, Framer Motion.

**Server** (`server/`): Node.js, Socket.IO, TypeScript, XState.

**Shared** (`shared-types/`): plain TypeScript — types, enums and event-name constants shared by both, no runtime logic of its own.

**Tooling:** npm workspaces, Prettier (formatting is CI-enforced), a custom `tools/probe/` Playwright-driven layout probe (outside the root workspaces on purpose, see [[Testing Strategy]]), and a set of `scripts/check-*.mjs` rule-integrity checks run in `npm run verify` (seeded shuffle, hidden cards, penalty placement, series totals, short peek, rejoin ownership, refused-action-answered, malformed payload, chat retention, dependency majors, commit style).

**Deploy:** client → Vercel, server → Render — see [[Deployment]].
