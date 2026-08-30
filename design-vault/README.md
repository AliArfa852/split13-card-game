# Design Vault — Obsidian setup

This folder is a self-contained Obsidian vault: reference notes on this project's mechanics and architecture, plus a scratchpad for redesigning it into your own game.

## Opening it in Obsidian

1. Open Obsidian.
2. "Open folder as vault" → select **this `design-vault` folder** (not the whole repo — the repo also has `.git`, `node_modules`, etc. that don't belong in a vault).
3. Start from **`00 - Home.md`** — it links out to everything else.

Obsidian will create its own `.obsidian/` settings folder here the first time you open it; that's normal and safe to ignore (or `.gitignore` if you don't want editor settings committed).

## Layout

- `Mechanics/` — how the game plays (from `docs/GAME_RULES.md` + the type/enum definitions that implement it).
- `Architecture/` — how the code is built (from `docs/ARCHITECTURE.md` + `shared-types`/`server`/`client`).
- `Design/` — inferred design rationale: why the rules are shaped the way they are. Read this before changing core mechanics.
- `Redesign/` — your own working notes as you turn this into your own game: `Redesign Ideas.md` (scratchpad), `House Rules Draft.md` (decided changes), `Open Questions.md`.

Everything is cross-linked with `[[wikilinks]]`, so Obsidian's graph view will show how mechanics, architecture and design connect — useful once you start pulling threads for your redesign.

## Keeping it current

These notes are a snapshot, not generated docs — if you change the actual game rules or architecture, the source of truth is still the code and `docs/GAME_RULES.md`/`docs/ARCHITECTURE.md`. Update the matching notes here when you make a real decision, and use `Redesign/House Rules Draft.md` to track how your version has diverged from the notes in `Mechanics/`.
