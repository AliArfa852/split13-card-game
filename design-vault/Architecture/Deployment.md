---
tags: [architecture]
---
Up: [[00 - Home]] · [[Architecture Overview]]

# Deployment

Client and server deploy **separately**, both from `main`, no staging environment between them:
- Client → **Vercel**
- Server → **Render**

They're joined only at runtime, by URL: the client reads `NEXT_PUBLIC_WEBSOCKET_URL` (`client/lib/socket.ts`), falling back to `http://localhost:8000` (what `npm run dev` serves locally). Nothing else couples the deployments — either side can be running a different version of `shared-types` than the other at any given moment.

Practical consequences (from `CONTRIBUTING.md`):
- A PR preview **cannot** test a server change — Vercel only builds the client, and the preview talks to whatever server is already live. A branch that adds a field to a broadcast will show the preview client reading it as missing, which looks exactly like a client bug but isn't one.
- Don't add an `engines` field or `.nvmrc` — both platforms read them and it would silently change the Node version the live deployment builds with.
