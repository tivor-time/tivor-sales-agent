import {
  createTenantContextFromWorker,
  runInTenant,
  isDbConfigured,
  type TenantContext,
} from '@tradepilot/db'
import { log } from './logger'

/**
 * Run `fn` with a tenant-scoped context built from a validated event payload.
 *
 * This is the ONLY way a worker handler touches the database — it never holds a
 * raw pool. Returns null (a logged no-op) when DATABASE_URL is absent, so every
 * handler degrades gracefully when the worker boots with zero secrets.
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
