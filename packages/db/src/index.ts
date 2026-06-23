/**
 * @tradepilot/db — PUBLIC entry.
 *
 * Exposes ONLY tenant-scoped primitives. The raw pool (src/client/pool.ts) is
 * deliberately NOT exported, and an eslint rule bans importing it from apps/*,
 * so the only DB handle application code can get is a tenant-scoped
 * TenantContext.
 */

// Context + the single safe entry point
export {
  runInTenant,
  assembleContext,
  createTenantContextFromWorker,
  type TenantContext,
  type TenantContextPartial,
  type TenantSecretResolver,
  type SecretKey,
  type ContextSource,
} from './dal/context'

// Tenant resolution (used by the web auth layer + Clerk webhook + worker)
export {
  ensureTenant,
  assertTenantExists,
  listReceivableIdentities,
  listDueRecurringFollowUps,
  getTenantProfile,
  upsertTenantFromClerk,
  upsertUserFromClerk,
  upsertMembershipFromClerk,
  deleteMembership,
  type ClerkOrgInput,
  type ClerkUserInput,
  type ClerkMembershipInput,
} from './dal/tenants'

// Secret resolvers + encryption
export { makeNullSecretResolver, makeSecretResolver } from './dal/secrets'
export { encrypt, decrypt } from './crypto'

// Transaction helper + db availability flag (no raw handle exposed)
export { withTenantTransaction } from './client/rls'
export { isDbConfigured } from './client/pool'

// Errors + DAL types
export * from './dal/errors'
export type { ScopedDb } from './dal/build-repos'
export type { ScopedRepository, TenantTable } from './dal/repository'
export type { AuditAction } from './dal/audit'

// Schema namespace (for drizzle-kit, seed, tests, and typed query helpers)
export * as schema from './schema'
