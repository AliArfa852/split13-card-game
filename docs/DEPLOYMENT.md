# Deploying Split 13

Two deployments, joined only at runtime by a URL: the client on **Vercel**,
the server on **Render**. Neither knows about the other at build time, so
they can be deployed in either order — but the client needs the server's URL
to be useful, and the server needs the client's origin to accept it, so plan
on one round trip.

## Before you start

Run the full gate locally. Vercel will not tell you anything `verify` can't:

```
npm run verify
```

`npm run build -w client` is the part that matters for Vercel specifically.
Note it needs network at build time — `app/layout.tsx` pulls Nunito Sans
through `next/font/google`, so an offline build hard-fails on it. Vercel has
network, so this is only a problem for local builds behind a firewall.

## 1. The client, on Vercel

**Project settings** (Vercel dashboard → the project → Settings → General):

| Setting                                  | Value            | Why                                                                                                                                                                        |
| ---------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework preset                         | Next.js          | Auto-detected.                                                                                                                                                             |
| Root Directory                           | `client`         | The Next app is a workspace, not the repo root.                                                                                                                            |
| Include files outside the Root Directory | **On**           | Required. `next.config.ts` aliases `shared-types` to `../shared-types/dist`, which lives outside `client/`. With this off the build cannot resolve the contract and fails. |
| Install / Build / Output                 | leave as default | The defaults are correct for npm workspaces.                                                                                                                               |

The contract builds itself: `client/package.json` has a `postinstall` of
`npm run build -w shared-types`, and npm resolves `-w` by walking up to the
workspace root, so it works even though install runs with `client/` as the
root directory. Nothing to configure.

**Environment variables** (Settings → Environment Variables):

| Variable                    | Value                                                               | Notes                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WEBSOCKET_URL` | your Render server URL, e.g. `https://split-13-server.onrender.com` | Required. Without it the client falls back to `http://localhost:8000` and a deployed site talks to nobody. `NEXT_PUBLIC_` means it is baked into the bundle at build time — changing it needs a redeploy, not just a restart. |
| `NEXT_PUBLIC_LOG_LEVEL`     | `warn` or `error`                                                   | Optional; defaults to `info`, which is chatty in a browser console.                                                                                                                                                           |

**Then set `SITE_URL`.** `client/lib/site.ts` hardcodes the canonical origin
and is currently the placeholder `https://split-13.vercel.app`. It is
deliberately not read from the environment — a preview deployment should
still declare production as canonical. Until you edit it, every social card,
sitemap entry and canonical link names a site that isn't yours. Edit it once
you know your real domain, then redeploy.

## 2. The server, on Render

A Node web service, built and started from the repo root:

| Setting           | Value                            |
| ----------------- | -------------------------------- |
| Build command     | `npm ci && npm run build:server` |
| Start command     | `npm start -w server`            |
| Health check path | `/health`                        |

`build:server` builds `shared-types` first, then the server — that ordering
is deliberate and is what stops the "no exported member" failure.

**Environment variables** — the full set the code reads is documented in
`server/.env.example`. The one that must change for production:

| Variable      | Value                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| `CORS_ORIGIN` | your Vercel domain, comma-separated if more than one, e.g. `https://split-13.vercel.app` |

`PORT` is set by Render automatically. `TURN_TIMER_MS`, `BOT_THINK_MIN_MS`,
`BOT_THINK_MAX_MS` and the two `SOCKET_PING_*` values all have working
defaults; set them only to tune pacing.

**Cold starts.** Render's free tier sleeps an idle service, and the first
connection then takes ~30-60s to wake it. The client already handles this —
`ColdStartWaitNotice` tells the player the server is waking rather than
looking broken — but it is worth knowing before you think something hung.

## 3. The round trip

1. Deploy the server; note its URL.
2. Set `NEXT_PUBLIC_WEBSOCKET_URL` on Vercel to that URL; deploy the client.
3. Note the Vercel domain; set `CORS_ORIGIN` on Render to it.
4. Edit `SITE_URL` in `client/lib/site.ts` to the same domain, commit, redeploy.

## Things that will bite you

- **A Vercel preview cannot test a server change.** Vercel only builds the
  client, and a preview talks to whatever server is already live. A branch
  that adds a field to a broadcast shows the preview client reading it as
  missing, which looks exactly like a client bug and isn't one.
- **Don't add an `engines` field or an `.nvmrc`.** Both platforms read them,
  and it would silently change the Node version the live deployments build
  with.
- **`NEXT_PUBLIC_*` is build-time.** Changing one in the Vercel dashboard
  does nothing until you redeploy.
