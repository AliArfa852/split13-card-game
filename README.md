# Split 13

[![CI](https://github.com/vroslmend/check-the-card-game-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/vroslmend/check-the-card-game-v2/actions/workflows/ci.yml)

A browser card game for four players in two teams, built with Next.js, Socket.IO and XState.

_[Rules](docs/GAME_RULES.md)_ · _[Architecture](docs/ARCHITECTURE.md)_ · _[Contributing](CONTRIBUTING.md)_

## The game

The deck is split thirteen cards each between four players, seated as two
teams of two. You always see your own hand.

On your turn you throw one card onto the table stack. If its rank matches the
card on top, you take the whole stack — every card that has piled up since the
last capture — and it scores for your team. If it does not match, your card
becomes the new top for the next player to try, and the pile gets bigger.

Aces are worth 20, tens and the picture cards 10, everything else 5. So the
stack is a pot that grows, and every throw is a bet on whether you or the
player after you takes it.

Turns are clocked at 20 seconds. When the cards run out the higher team total
wins; whatever is still on the table scores for nobody.

Any seat nobody takes is filled by a bot, so one player and three bots is a
real game.

Full rules: [docs/GAME_RULES.md](docs/GAME_RULES.md)

## Running locally

```bash
npm ci
npm run dev
```

That builds the shared types and the server, then runs the Next.js client and
the Socket.IO server together. You need both: the server is authoritative for
every rule in the game.

Client on `localhost:3000`, server on `localhost:8000`. Copy the `.env.example` files in `client/` and `server/` if you want to change ports, timers or table size.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before filing an issue or opening a pull request.

## Licence

The source is public. You may read, fork and modify it for personal, non-commercial and educational use, and the hosted game is free to play. Commercial use, redistribution and running a competing public instance are not permitted. See [LICENSE.md](LICENSE.md), and the contribution terms in [CONTRIBUTING.md](CONTRIBUTING.md) if you plan to send code.
