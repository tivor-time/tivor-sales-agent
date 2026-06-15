import { sql } from 'drizzle-orm'
import { getDb, type AppTransaction } from './pool'

/**
 * Run `fn` inside a transaction that has `app.tenant_id` set, so Postgres RLS
 * policies (defense-in-depth) apply to every statement. `set_config(..., true)`
 * is transaction-scoped (resets on commit/rollback) and therefore safe under
 * Neon's connection pooling — we never use a plain session-level `SET`.
 */
export async function withTenantTransaction<R>(
  tenantId: string,
  fn: (tx: AppTransaction) => Promise<R>,
): Promise<R> {
  const db = getDb()
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`)
    return fn(tx as AppTransaction)
  })
}
