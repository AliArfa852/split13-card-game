---
tags: [architecture]
---
Up: [[00 - Home]] · [[Architecture Overview]]

# Testing Strategy

**No unit or state-machine test suite right now.** An earlier Vitest suite (game machine, state redactor, deck utils) was removed and hasn't been replaced — rules verification is currently manual, against `GAME_RULES.md`. Tracked in issue #36. The architecture is friendly to restoring it: `game-machine.ts` is pure and input-configured, `generatePlayerView` is a pure function — both are testable with no socket or browser.

**What does exist:** `npm run probe` (`tools/probe/`), a Playwright-driven layout probe. It's deliberately kept outside the root npm workspaces, with its own manifest, so plain `npm ci` never pulls a browser into the Vercel/Render install. It drives a real game in a real browser, sweeping screen sizes, and reports whether the view fits, every control is hittable, and nothing shifts sideways when only the game phase changes. Only the observed player gets a real browser — everyone else is a raw `socket.io-client`, so a scripted round takes seconds, not minutes. Remaining scope tracked in issue #57; a wire-level harness reusing the same lightweight clients is issue #75.

**Rule-integrity scripts** (`scripts/check-*.mjs`, run via `npm run verify`): seeded shuffle, hidden-card leakage, penalty placement, series totals, short peek, rejoin ownership, refused-action-answered, malformed payload, chat retention — these are narrow, targeted regression guards, not a general test suite.

If your redesign changes rules, there's currently no automated rules test to update — verification is "play a round and follow the rule end to end" (per `CONTRIBUTING.md`). Worth keeping in mind if you're forking this for something you'll iterate on a lot.
