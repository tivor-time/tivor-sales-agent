/**
 * Typed environment loader + derived feature flags.
 *
 * SERVER-ONLY. Never import this from a client component — it reads provider
 * secrets from `process.env`. Client code receives the safe `flags` object via a
 * server-populated React context instead.
 *
 * Design rule: this module must NEVER throw on a missing optional key. The app
 * is required to boot and be demoable with ZERO secrets configured; absence of a
 * provider key simply flips a feature flag off. Only the env *shape* is checked.
 */
import { z } from 'zod'

/** Optional string that treats "" as undefined (Vercel/Railway inject empty strings for unset vars). */
const opt = z
  .string()
  .trim()
  .min(1)
  .optional()
  .catch(undefined)

/** Optional boolean env parser with permissive true values. */
const optBool = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => {
    if (typeof v === 'boolean') return v
    if (!v) return false
    return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase())
  })
  .catch(false)

const rawSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Auth (Clerk Organizations)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: opt,
  CLERK_SECRET_KEY: opt,
  CLERK_WEBHOOK_SIGNING_SECRET: opt,

  // Database (Neon / Postgres)
  DATABASE_URL: opt,

  // AI (OpenAI preferred, Anthropic optional fallback). Models are defaulted.
  OPENAI_API_KEY: opt,
  OPENAI_MODEL: z.string().default('gpt-4.1'),
  OPENAI_MODEL_FAST: z.string().default('gpt-4.1-mini'),
  ANTHROPIC_API_KEY: opt,
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-8'),
  ANTHROPIC_MODEL_FAST: z.string().default('claude-sonnet-4-6'),

  // Email send/receive
  GMAIL_CLIENT_ID: opt,
  GMAIL_CLIENT_SECRET: opt,
  GMAIL_REDIRECT_URI: opt,
  MS_GRAPH_CLIENT_ID: opt,
  MS_GRAPH_CLIENT_SECRET: opt,
  MS_GRAPH_TENANT_ID: opt,
  MS_GRAPH_REDIRECT_URI: opt,
  UNIPILE_DSN: opt,
  UNIPILE_API_KEY: opt,
  UNIPILE_WEBHOOK_SECRET: opt,

  // Transactional email
  RESEND_API_KEY: opt,

  // Billing
  STRIPE_SECRET_KEY: opt,
  STRIPE_WEBHOOK_SECRET: opt,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: opt,

  // Durable jobs
  INNGEST_EVENT_KEY: opt,
  INNGEST_SIGNING_KEY: opt,

  // Redis (rate limiting, idempotency, locks)
  UPSTASH_REDIS_REST_URL: opt,
  UPSTASH_REDIS_REST_TOKEN: opt,

  // Observability
  SENTRY_DSN: opt,
  NEXT_PUBLIC_SENTRY_DSN: opt,

  // Trade-data providers (F1)
  VOLZA_API_KEY: opt,
  IMPORTGENIUS_API_KEY: opt,
  IMPORTKEY_API_KEY: opt,
  TENDATA_API_KEY: opt,

  // Contact enrichment
  APOLLO_API_KEY: opt,
  HUNTER_API_KEY: opt,

  // Secret storage (encrypt OAuth tokens / provider keys at rest)
  MASTER_ENCRYPTION_KEY: opt,

  // DEV/launch override: allow sending without SPF/DKIM/DMARC verification.
  ALLOW_UNVERIFIED_SENDING: optBool,

  // App URL (used for OAuth redirects, webhook URLs, unsubscribe links)
  APP_URL: z.string().url().default('http://localhost:3000'),
})

export type Env = z.infer<typeof rawSchema>

/** safeParse + per-field .catch guarantees this never throws. */
function loadEnv(): Env {
  const parsed = rawSchema.safeParse(process.env)
  return parsed.success ? parsed.data : rawSchema.parse({})
}

export const env: Env = loadEnv()

const has = (...keys: (string | undefined)[]) => keys.every((k) => !!k)
const hasAny = (...keys: (string | undefined)[]) => keys.some((k) => !!k)

const isGmailEnabled = has(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, env.GMAIL_REDIRECT_URI)
const isMsGraphEnabled = has(
  env.MS_GRAPH_CLIENT_ID,
  env.MS_GRAPH_CLIENT_SECRET,
  env.MS_GRAPH_TENANT_ID,
  env.MS_GRAPH_REDIRECT_URI,
)
const isUnipileEnabled = has(env.UNIPILE_DSN, env.UNIPILE_API_KEY, env.UNIPILE_WEBHOOK_SECRET)

/**
 * Feature flags derived ONCE from key presence and consumed everywhere. This is
 * what makes graceful degradation uniform — no scattered process.env reads.
 */
export const flags = {
  isAuthEnabled: has(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, env.CLERK_SECRET_KEY),
  isClerkWebhookEnabled: has(env.CLERK_WEBHOOK_SIGNING_SECRET),
  isDatabaseEnabled: has(env.DATABASE_URL),
  isOpenAiEnabled: has(env.OPENAI_API_KEY),
  isAnthropicEnabled: has(env.ANTHROPIC_API_KEY),
  isAiEnabled: hasAny(env.OPENAI_API_KEY, env.ANTHROPIC_API_KEY),
  isGmailEnabled,
  isMsGraphEnabled,
  isUnipileEnabled,
  isAnyMailboxProviderConfigured: isGmailEnabled || isMsGraphEnabled || isUnipileEnabled,
  isResendEnabled: has(env.RESEND_API_KEY),
  isBillingEnabled: has(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET),
  isJobsEnabled: has(env.INNGEST_EVENT_KEY, env.INNGEST_SIGNING_KEY),
  isRedisEnabled: has(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN),
  isSentryEnabled: has(env.SENTRY_DSN),
  isTradeDataEnabled: hasAny(
    env.VOLZA_API_KEY,
    env.IMPORTGENIUS_API_KEY,
    env.IMPORTKEY_API_KEY,
    env.TENDATA_API_KEY,
  ),
  isEnrichmentEnabled: hasAny(env.APOLLO_API_KEY, env.HUNTER_API_KEY),
  isSecretStorageEnabled: has(env.MASTER_ENCRYPTION_KEY),
  // DEV/launch escape hatch only — never honored in production, so a stray
  // ALLOW_UNVERIFIED_SENDING=true can't push unauthenticated mail from a prod deploy.
  isDomainAuthBypassEnabled: env.ALLOW_UNVERIFIED_SENDING && env.NODE_ENV !== 'production',
} as const

export type Flags = typeof flags

/**
 * Sending is a per-tenant composite gate, not a static flag: domain-auth
 * verification lives on EmailIdentity rows. Sending stays OFF until domain auth
 * verifies, even when provider keys exist (hard deliverability constraint).
 */
export function isSendingEnabled(opts: { hasVerifiedDomainAuth: boolean }): boolean {
  return (
    flags.isAnyMailboxProviderConfigured &&
    flags.isSecretStorageEnabled &&
    (opts.hasVerifiedDomainAuth || flags.isDomainAuthBypassEnabled)
  )
}

/** Which trade-data providers have keys (worker picks one). */
export function activeTradeDataProviders(): string[] {
  return [
    env.VOLZA_API_KEY && 'volza',
    env.IMPORTGENIUS_API_KEY && 'importgenius',
    env.IMPORTKEY_API_KEY && 'importkey',
    env.TENDATA_API_KEY && 'tendata',
  ].filter(Boolean) as string[]
}

/** Which enrichment providers have keys. */
export function activeEnrichmentProviders(): string[] {
  return [env.APOLLO_API_KEY && 'apollo', env.HUNTER_API_KEY && 'hunter'].filter(
    Boolean,
  ) as string[]
}
