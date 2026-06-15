import { tenantScopedTables } from '../schema'
import { createScopedRepository, type ScopedRepository, type TenantTable } from './repository'
import type { TenantContext } from './context'
import type { AppTransaction } from '../client/pool'

/**
 * Compile-time guarantee: every registered table is tenant-scoped (has both a
 * `tenantId` and `id` column). Registering a global table here is a type error.
 * Iterated at runtime to build the scoped repository map.
 */
const registered: Record<string, TenantTable> = tenantScopedTables

/** The typed, tenant-scoped repository map exposed as `ctx.db.<table>`. */
export type ScopedDb = {
  [K in keyof typeof tenantScopedTables]: ScopedRepository<
    (typeof tenantScopedTables)[K] & TenantTable
  >
}

export function buildScopedDb(ctx: TenantContext, tx: AppTransaction): ScopedDb {
  const out: Record<string, ScopedRepository<TenantTable>> = {}
  for (const [name, table] of Object.entries(registered)) {
    out[name] = createScopedRepository(table, name, ctx, tx)
  }
  return out as ScopedDb
}
