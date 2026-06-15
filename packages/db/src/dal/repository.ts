import { and, eq, count as countFn, type SQL } from 'drizzle-orm'
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core'
import type { AppTransaction } from '../client/pool'
import type { TenantContext } from './context'
import { writeAudit } from './audit'

/** Type-level proof a table is tenant-scoped: it MUST expose a `tenantId` column. */
export type TenantTable = PgTable & { tenantId: PgColumn; id: PgColumn }

type Row<T extends TenantTable> = T['$inferSelect']
/** Insert type with tenantId removed → callers CANNOT set it (compile error if they try). */
type InsertInput<T extends TenantTable> = Omit<T['$inferInsert'], 'tenantId'>
type UpdateInput<T extends TenantTable> = Partial<Omit<Row<T>, 'id' | 'tenantId'>>

export interface ScopedRepository<T extends TenantTable> {
  findMany(opts?: { where?: SQL; limit?: number; offset?: number; orderBy?: SQL }): Promise<Row<T>[]>
  findById(id: string): Promise<Row<T> | null>
  findFirst(where: SQL): Promise<Row<T> | null>
  count(where?: SQL): Promise<number>
  insert(values: InsertInput<T>): Promise<Row<T>>
  insertMany(values: InsertInput<T>[]): Promise<Row<T>[]>
  update(id: string, patch: UpdateInput<T>): Promise<Row<T> | null>
  delete(id: string): Promise<boolean>
}

/**
 * The core multi-tenancy invariant. Every read/write is ANDed with
 * eq(tenantId, ctx.tenantId); tenant_id is force-set on inserts and stripped
 * from the insert type. There is no method that omits the predicate.
 */
export function createScopedRepository<T extends TenantTable>(
  table: T,
  tableName: string,
  ctx: TenantContext,
  tx: AppTransaction,
): ScopedRepository<T> {
  const t = table as unknown as { tenantId: PgColumn; id: PgColumn }
  const tenantPredicate = eq(t.tenantId, ctx.tenantId)
  const scoped = (where?: SQL): SQL => (where ? and(tenantPredicate, where)! : tenantPredicate)

  const audit = (
    action: Parameters<typeof writeAudit>[2]['action'],
    entityId: string | null,
    before?: unknown,
    after?: unknown,
  ) => writeAudit(tx, ctx, { action, entityType: tableName, entityId, before, after })

  const repo: ScopedRepository<T> = {
    async findMany(opts) {
      const rows = await tx
        .select()
        .from(table as PgTable)
        .where(scoped(opts?.where))
        .limit(opts?.limit ?? 200)
        .offset(opts?.offset ?? 0)
        .orderBy(opts?.orderBy ?? t.id)
      return rows as Row<T>[]
    },
    async findById(id) {
      const rows = await tx
        .select()
        .from(table as PgTable)
        .where(and(tenantPredicate, eq(t.id, id))!)
        .limit(1)
      return (rows[0] as Row<T>) ?? null
    },
    async findFirst(where) {
      const rows = await tx
        .select()
        .from(table as PgTable)
        .where(scoped(where))
        .limit(1)
      return (rows[0] as Row<T>) ?? null
    },
    async count(where) {
      const rows = await tx
        .select({ value: countFn() })
        .from(table as PgTable)
        .where(scoped(where))
      return Number(rows[0]?.value ?? 0)
    },
    async insert(values) {
      const rows = (await tx
        .insert(table)
        .values({ ...(values as object), tenantId: ctx.tenantId } as never)
        .returning()) as Row<T>[]
      const row = rows[0] as Row<T>
      await audit('create', (row as { id: string }).id, null, row)
      return row
    },
    async insertMany(values) {
      if (values.length === 0) return []
      const rows = (await tx
        .insert(table)
        .values(values.map((v) => ({ ...(v as object), tenantId: ctx.tenantId })) as never)
        .returning()) as Row<T>[]
      await audit('import', null, null, {
        count: rows.length,
        ids: rows.map((r) => (r as { id: string }).id),
      })
      return rows as Row<T>[]
    },
    async update(id, patch) {
      const before = await repo.findById(id) // tenant-scoped → cannot read B's row
      if (!before) return null // cross-tenant id silently yields null
      const rows = (await tx
        .update(table)
        .set({ ...(patch as object), tenantId: ctx.tenantId } as never)
        .where(and(tenantPredicate, eq(t.id, id))!)
        .returning()) as Row<T>[]
      const row = (rows[0] as Row<T>) ?? null
      await audit('update', id, before, row)
      return row
    },
    async delete(id) {
      const before = await repo.findById(id)
      if (!before) return false
      await tx.delete(table).where(and(tenantPredicate, eq(t.id, id))!)
      await audit('delete', id, before, null)
      return true
    },
  }

  return repo
}
