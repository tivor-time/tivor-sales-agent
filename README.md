# TradePilot

Multi-tenant B2B trade-outreach SaaS for export businesses. TradePilot automates the
international-trade sales pipeline: source importer leads from trade data → AI multilingual
personalized cold outreach (human-approved) → inbound inquiry triage → marketplace listing
content → market intelligence → sample/follow-up tracking.

Nothing is hardcoded to one industry — every tenant configures its own company profile, catalog,
target markets, languages, ICP, certifications, sending identities, and data sources. The reference
seed tenant (for demos + acceptance tests) is **Sri Durga Agro Exports**, a gherkin exporter
selling to DE/ES/FR/PL.

## Tech stack

- **Frontend:** Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui · TanStack Query · React Hook Form + Zod
- **Backend:** Next.js server actions/route handlers + a separate worker service
- **DB:** PostgreSQL (Neon) + Drizzle ORM (typed migrations), `tenant_id` on every row
- **Jobs:** Inngest (durable, idempotent, retryable)
- **Auth + multi-tenancy:** Clerk Organizations (org = tenant)
- **AI:** Anthropic Claude
- **Email:** Gmail API + Microsoft Graph (OAuth) · Resend (transactional)
- **Payments:** Stripe (plans + metered usage)
- **Hosting:** Vercel (web) · Railway (worker) · Neon (db) · Upstash (Redis)
- **Observability:** Sentry · pino structured logs · OpenTelemetry · per-tenant audit log
- **Testing:** Vitest (unit) · Playwright (e2e) · CI on every PR

## Monorepo layout

```
apps/
  web/        # Next.js app (UI, server actions, route handlers, Clerk)   — TODO
  worker/     # Inngest worker service (sequences, nudges, syncs, briefs) — TODO
packages/
  shared/     # env loader + feature flags, logger, Inngest event schemas,
              # provider-adapter interfaces, shared types/constants
  db/         # Drizzle schema (tenant_id everywhere), migrations, and the
              # tenant-scoped Data Access Layer (isolation by construction)
```

## Multi-tenancy & isolation

Tenant isolation is enforced in a **single data-access layer**, two ways:

1. **App layer (primary):** application code never receives a raw DB handle. It gets a
   `TenantContext` whose `ctx.db.<table>` repositories inject `eq(tenant_id, ctx.tenantId)` into
   every read/write and force-set `tenant_id` on inserts — passing `tenantId` is a *compile error*.
   An eslint rule bans importing the raw pool from `apps/*`.
2. **DB layer (defense-in-depth):** Postgres Row-Level Security (`FORCE ROW LEVEL SECURITY` +
   a `tenant_isolation` policy on every tenant table) keyed off `app.tenant_id`, which the DAL sets
   per transaction via `set_config('app.tenant_id', $1, true)`. Connect production via a dedicated
   non-`BYPASSRLS` role.

Every mutating DAL call writes an `AuditEvent` in the same transaction.

## Graceful degradation

The app **boots and is demoable with zero secrets configured.** Each provider key maps to a feature
flag (`packages/shared/src/env.ts`); absence flips the feature off rather than crashing. See
[.env.example](.env.example) for the full matrix. Notably, **sending stays OFF until domain auth
(SPF/DKIM/DMARC) verifies**, even when mail provider keys are present.

## Getting started

```bash
nvm use                 # Node 24
corepack enable         # pnpm 11
pnpm install

# typecheck / lint / test the whole monorepo
pnpm typecheck
pnpm lint
pnpm test

# database (requires DATABASE_URL)
pnpm db:generate        # diff schema -> SQL migrations (committed)
pnpm db:migrate         # apply migrations
pnpm db:seed            # seed the Sri Durga Agro Exports reference tenant
```

## Build phases

P0 Foundation · P1 Catalog + Leads (CSV import) · P2 AI outreach + approval queue ·
P3 Mailbox OAuth + deliverability · P4 Inbound triage · P5 Samples + follow-ups ·
P6 Listings · P7 Market intel · P8 Real trade-data + enrichment · P9 Billing + hardening.

**Status: Phase 0 in progress.** Done: monorepo + tooling, `packages/shared` (env/flags/logger/
events/providers), `packages/db` (full schema with `tenant_id` everywhere, generated migrations,
RLS policies, tenant-scoped DAL with audit). Both packages typecheck + lint clean. Next: `apps/web`
(design system, app shell, Clerk middleware, onboarding wizard), `apps/worker`, CI, and the
isolation test suite against Postgres.
