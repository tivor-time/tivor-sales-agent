import {
  createTenantContextFromWorker,
  runInTenant,
  isDbConfigured,
  type TenantContext,
  type TenantContextPartial,
} from '@tradepilot/db'
import { log } from './logger'

/**
 * Run `fn` in ONE tenant-scoped transaction. Convenient for handlers that do a
 * single unit of DB work. Returns null (logged no-op) when the DB is absent.
 * Do NOT use this for the send path — it must not hold a transaction across the
 * network send; use resolveWorkerTenant + multiple runInTenant calls instead.
 */
export async function withTenant<R>(
  args: { tenantId: string; actorUserId?: string; requestId: string },
  fn: (ctx: TenantContext) => Promise<R>,
): Promise<R | null> {
  if (!isDbConfigured()) {
    log.warn({ tenantId: args.tenantId }, 'DATABASE_URL absent — skipping DB work')
    return null
  }
  const partial = await createTenantContextFromWorker(args)
  return runInTenant(partial, fn)
}

/**
 * Resolve a tenant context WITHOUT opening a transaction, so the caller can run
 * several short transactions (and perform network I/O between them). Returns
 * null when the DB is not configured. The send path uses this to commit its
 * queued->sending claim BEFORE the network send, so a post-send rollback can
 * never re-queue and re-send a message.
 */
export async function resolveWorkerTenant(args: {
  tenantId: string
  actorUserId?: string
  requestId: string
}): Promise<TenantContextPartial | null> {
  if (!isDbConfigured()) {
    log.warn({ tenantId: args.tenantId }, 'DATABASE_URL absent — skipping DB work')
    return null
  }
  return createTenantContextFromWorker(args)
}
