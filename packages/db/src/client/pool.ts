/**
 * INTERNAL ONLY. The raw, un-scoped database handle.
 *
 * This module is deliberately NOT re-exported from the package root, and an
 * eslint rule bans importing it from apps/*. The only legitimate DB handle in
 * application code is a TenantContext (runInTenant / resolveTenantContext),
 * which guarantees every query is tenant-scoped.
 *
 * Uses node-postgres (`pg` Pool) so we get real transactions — required for the
 * per-request `SET LOCAL app.tenant_id` (RLS) and atomic audit writes. Works
 * against local Postgres (CI/tests) and Neon (wire-compatible) in production.
 */
import { Pool } from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { env } from '@tradepilot/shared/env'
import * as schema from '../schema'
import { DatabaseUnavailableError } from '../dal/errors'

export type AppDatabase = NodePgDatabase<typeof schema>
export type AppTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0]

/** Hosted Postgres (Supabase, Neon, etc.) requires TLS; local Postgres does not. */
function requiresTls(url: string): boolean {
  return /supabase\.|sslmode=require|\.pooler\./i.test(url)
}

let pool: Pool | undefined
let dbInstance: AppDatabase | undefined

export function isDbConfigured(): boolean {
  return !!env.DATABASE_URL
}

/** Lazily create the pool + drizzle instance. Throws if DATABASE_URL is absent. */
export function getDb(): AppDatabase {
  if (!env.DATABASE_URL) throw new DatabaseUnavailableError()
  if (!dbInstance) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      ssl: requiresTls(env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
    })
    dbInstance = drizzle(pool, { schema, casing: 'snake_case' })
  }
  return dbInstance
}

/** Close the pool (tests / graceful shutdown). */
export async function closeDb(): Promise<void> {
  await pool?.end()
  pool = undefined
  dbInstance = undefined
}
