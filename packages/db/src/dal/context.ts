import type { Role } from '@tradepilot/shared'
import type { AppTransaction } from '../client/pool'
import { withTenantTransaction } from '../client/rls'
import { buildScopedDb, type ScopedDb } from './build-repos'
import { assertTenantExists } from './tenants'
import { makeSecretResolver } from './secrets'

export type ContextSource = 'web' | 'worker' | 'test'

export type SecretKey =
  | 'gmail_oauth'
  | 'msgraph_oauth'
  | 'resend_api'
  | 'stripe_account'
  | 'anthropic_api'
  | 'enrichment_api'

export interface TenantSecretResolver {
  /** Returns null (never throws) when the key is absent → graceful degradation. */
  get(key: SecretKey): Promise<string | null>
}

/** Everything needed to build a TenantContext except the scoped db (which needs a tx). */
export interface TenantContextPartial {
  tenantId: string
  userId: string
  clerkOrgId: string
  clerkUserId: string
  role: Role
  requestId: string
  source: ContextSource
  secrets: TenantSecretResolver
}

/** The ONLY db surface application code sees. Every method is tenant-scoped. */
export interface TenantContext extends TenantContextPartial {
  readonly db: ScopedDb
}

/** Bind a partial context to a transaction, producing the scoped db handle. */
export function assembleContext(partial: TenantContextPartial, tx: AppTransaction): TenantContext {
  const ctx = { ...partial } as TenantContext
  // buildScopedDb only reads ctx.tenantId/userId/source/requestId, never ctx.db,
  // so assigning db after construction is safe.
  ;(ctx as { db: ScopedDb }).db = buildScopedDb(ctx, tx)
  return ctx
}

/**
 * Run `fn` with a fully-assembled, tenant-scoped context inside a transaction
 * that also sets the RLS GUC. This is the single entry point app code uses.
 */
export async function runInTenant<R>(
  partial: TenantContextPartial,
  fn: (ctx: TenantContext) => Promise<R>,
): Promise<R> {
  return withTenantTransaction(partial.tenantId, (tx) => fn(assembleContext(partial, tx)))
}

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Build a worker context from a validated event payload. The tenant must exist
 * (a stale/forged id throws). No framework dependency — safe for the worker.
 */
export async function createTenantContextFromWorker(p: {
  tenantId: string
  actorUserId?: string
  requestId: string
}): Promise<TenantContextPartial> {
  const tenant = await assertTenantExists(p.tenantId)
  return {
    tenantId: tenant.id,
    userId: p.actorUserId ?? SYSTEM_USER_ID,
    clerkOrgId: tenant.clerkOrgId,
    clerkUserId: p.actorUserId ?? SYSTEM_USER_ID,
    role: 'owner',
    source: 'worker',
    requestId: p.requestId,
    secrets: makeSecretResolver(tenant.id),
  }
}
