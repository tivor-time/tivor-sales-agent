# @tradepilot/worker

Standalone Inngest worker service. Consumes the event contract from
`@tradepilot/shared` (`events.ts`) and runs durable, tenant-scoped jobs
(sequence sending, follow-up nudges, mailbox sync, inbound/bounce handling).
Deployed separately (e.g. Railway).

## Run locally

```bash
pnpm --filter @tradepilot/worker dev      # tsx watch, serves on :3030
# In another terminal, run the Inngest dev server to discover + invoke functions:
npx inngest-cli@latest dev -u http://localhost:3030/api/inngest -u http://localhost:3000/api/inngest
```

- `GET /health` → liveness + degradation state (`jobs`, `db`).
- `* /api/inngest` → the Inngest function endpoint.

`pnpm dev` at the repo root starts this alongside the web app via turbo.

## Graceful degradation

Boots with **zero secrets**. No `INNGEST_*` keys → runs unsigned in dev mode.
No `DATABASE_URL` → DB-backed handlers log and no-op (`withTenant` guard). The
server always listens; nothing throws on missing config.

## Env

| Var | Effect |
| --- | --- |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | enable signed cloud mode (`flags.isJobsEnabled`) |
| `DATABASE_URL` | enable DB-backed handlers |
| `APP_URL` | links/unsubscribe (used once P3 sending lands) |
| `PORT` | HTTP listen port (default `3030`) |

## Deploy (Railway)

Start command: `pnpm install && pnpm --filter @tradepilot/worker start`
(runs `tsx src/index.ts`). Set the env vars above.
