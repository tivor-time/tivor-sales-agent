import { sql } from 'drizzle-orm'
import { timestamp, uuid } from 'drizzle-orm/pg-core'
import { tenants } from './tenant'

/**
 * Standard surrogate primary key. Postgres generates the uuid
 * (gen_random_uuid, built-in on Neon) so inserts never need an app-side id.
 */
export const id = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`)

/** createdAt / updatedAt present on EVERY table. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

/**
 * Soft-delete column. Spread into tables holding PII or subject to GDPR/
 * retention rules. NULL = live, non-null = tombstoned. The DAL filters
 * isNull(deletedAt) by default.
 */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}

/**
 * The tenant scoping column. NOT NULL + FK to tenants.id + ON DELETE CASCADE so
 * deleting a tenant purges all its data (org-level right-to-erasure). Defined as
 * a thunk; `tenant.ts` must NOT import this helper to avoid an import cycle.
 */
export const tenantId = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' })
