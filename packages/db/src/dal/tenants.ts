/**
 * Tenant resolution — the ONE place that touches the global tenants/users/
 * memberships tables outside a tenant scope. Used by:
 *  - the Clerk webhook (idempotent upserts), and
 *  - the lazy ensure-on-first-request fallback (web), and
 *  - the worker (assertTenantExists).
 * All upserts are idempotent so the webhook + lazy paths coexist safely.
 */
import { randomUUID } from 'node:crypto'
import { and, eq, isNull, inArray, ne, lte, isNotNull } from 'drizzle-orm'
import type { Role, Language } from '@tradepilot/shared'
import { getDb } from '../client/pool'
import { withTenantTransaction } from '../client/rls'
import { tenants, users, memberships, emailIdentities, followUpTasks } from '../schema'
import { TenantNotFoundError } from './errors'
import { makeSecretResolver } from './secrets'
import type { TenantContextPartial } from './context'

export interface ClerkOrgInput {
  clerkOrgId: string
  name: string
  slug?: string
}
export interface ClerkUserInput {
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  imageUrl?: string
}
export interface ClerkMembershipInput {
  clerkOrgId: string
  clerkUserId: string
  role: Role
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org'
  )
}

/** Throws TenantNotFoundError if the tenant is missing or soft-deleted. */
export async function assertTenantExists(
  tenantId: string,
): Promise<{ id: string; clerkOrgId: string }> {
  const db = getDb()
  const rows = await db
    .select({ id: tenants.id, clerkOrgId: tenants.clerkOrgId })
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
    .limit(1)
  const row = rows[0]
  if (!row) throw new TenantNotFoundError(tenantId)
  return row
}

/**
 * List every connected (non-deleted) Gmail/Microsoft identity across ALL tenants
 * — the one narrowly-scoped cross-tenant read the inbound poll cron needs to fan
 * out per-identity work. Global read (like assertTenantExists); never exposes row
 * data, only ids the per-identity handler then loads tenant-scoped.
 */
export async function listReceivableIdentities(): Promise<
  { tenantId: string; emailIdentityId: string; provider: string }[]
> {
  const db = getDb()
  return db
    .select({
      tenantId: emailIdentities.tenantId,
      emailIdentityId: emailIdentities.id,
      provider: emailIdentities.provider,
    })
    .from(emailIdentities)
    .where(
      and(
        isNull(emailIdentities.deletedAt),
        inArray(emailIdentities.provider, ['gmail', 'microsoft']),
      ),
    )
}

/**
 * List recurring follow-up tasks that are due across ALL tenants — the one
 * cross-tenant read the follow-ups sweep cron needs to fan out per-task nudges.
 * One-off tasks are intentionally excluded (they stay overdue + visible in the
 * UI; only recurring tasks need rescheduling).
 */
export async function listDueRecurringFollowUps(): Promise<
  { tenantId: string; followUpTaskId: string }[]
> {
  const db = getDb()
  return db
    .select({ tenantId: followUpTasks.tenantId, followUpTaskId: followUpTasks.id })
    .from(followUpTasks)
    .where(
      and(
        isNull(followUpTasks.deletedAt),
        ne(followUpTasks.cadence, 'once'),
        inArray(followUpTasks.status, ['open', 'in_progress']),
        isNotNull(followUpTasks.dueDate),
        lte(followUpTasks.dueDate, new Date()),
      ),
    )
    .limit(500)
}

/** Read a tenant's profile (target markets, default language, company profile) for
 * ICP scoring and AI personalization. Global read via the resolver layer. */
export async function getTenantProfile(tenantId: string): Promise<{
  name: string
  targetMarkets: string[]
  defaultLanguage: Language
  companyProfile: Record<string, unknown>
}> {
  const db = getDb()
  const rows = await db
    .select({
      name: tenants.name,
      targetMarkets: tenants.targetMarkets,
      defaultLanguage: tenants.defaultLanguage,
      companyProfile: tenants.companyProfile,
    })
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
    .limit(1)
  const row = rows[0]
  if (!row) throw new TenantNotFoundError(tenantId)
  return {
    name: row.name,
    targetMarkets: row.targetMarkets ?? [],
    defaultLanguage: row.defaultLanguage as Language,
    companyProfile: (row.companyProfile ?? {}) as Record<string, unknown>,
  }
}

/** Idempotent upsert of a tenant from a Clerk organization. */
export async function upsertTenantFromClerk(input: ClerkOrgInput): Promise<{ id: string }> {
  const db = getDb()
  const slug = input.slug
    ? slugify(input.slug)
    : `${slugify(input.name)}-${input.clerkOrgId.slice(-6)}`
  const rows = await db
    .insert(tenants)
    .values({ clerkOrgId: input.clerkOrgId, name: input.name, slug })
    .onConflictDoUpdate({
      target: tenants.clerkOrgId,
      set: { name: input.name, updatedAt: new Date() },
    })
    .returning({ id: tenants.id })
  return rows[0]!
}

/** Idempotent upsert of a user from Clerk. */
export async function upsertUserFromClerk(input: ClerkUserInput): Promise<{ id: string }> {
  const db = getDb()
  const rows = await db
    .insert(users)
    .values({
      clerkUserId: input.clerkUserId,
      email: input.email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      imageUrl: input.imageUrl ?? null,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email: input.email,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        imageUrl: input.imageUrl ?? null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id })
  return rows[0]!
}

/** Idempotent upsert of a membership, creating minimal tenant/user stubs if needed. */
export async function upsertMembershipFromClerk(input: ClerkMembershipInput): Promise<void> {
  const tenant = await upsertTenantFromClerk({
    clerkOrgId: input.clerkOrgId,
    name: input.clerkOrgId,
  })
  const user = await upsertUserFromClerk({
    clerkUserId: input.clerkUserId,
    email: `${input.clerkUserId}@unknown.local`,
  })
  // memberships is tenant-scoped (RLS) — set the GUC for the write to pass WITH CHECK.
  await withTenantTransaction(tenant.id, (tx) =>
    tx
      .insert(memberships)
      .values({ tenantId: tenant.id, userId: user.id, role: input.role })
      .onConflictDoUpdate({
        target: [memberships.tenantId, memberships.userId],
        set: { role: input.role, deletedAt: null, updatedAt: new Date() },
      }),
  )
}

/** Soft-delete a membership when removed in Clerk. */
export async function deleteMembership(input: {
  clerkOrgId: string
  clerkUserId: string
}): Promise<void> {
  const db = getDb()
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.clerkOrgId, input.clerkOrgId))
    .limit(1)
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, input.clerkUserId))
    .limit(1)
  if (!tenant || !user) return
  await withTenantTransaction(tenant.id, (tx) =>
    tx
      .update(memberships)
      .set({ deletedAt: new Date() })
      .where(and(eq(memberships.tenantId, tenant.id), eq(memberships.userId, user.id))),
  )
}

/**
 * Lazy ensure-on-first-request: guarantees tenant/user/membership rows exist for
 * the current Clerk session and returns a ready TenantContextPartial. Idempotent.
 */
export async function ensureTenant(input: {
  clerkOrgId: string
  clerkUserId: string
  role: Role
  userEmail?: string
  orgName?: string
  requestId?: string
}): Promise<TenantContextPartial> {
  const tenant = await upsertTenantFromClerk({
    clerkOrgId: input.clerkOrgId,
    name: input.orgName ?? input.clerkOrgId,
  })
  const user = await upsertUserFromClerk({
    clerkUserId: input.clerkUserId,
    email: input.userEmail ?? `${input.clerkUserId}@unknown.local`,
  })
  await withTenantTransaction(tenant.id, (tx) =>
    tx
      .insert(memberships)
      .values({ tenantId: tenant.id, userId: user.id, role: input.role })
      .onConflictDoUpdate({
        target: [memberships.tenantId, memberships.userId],
        set: { role: input.role, deletedAt: null, updatedAt: new Date() },
      }),
  )
  return {
    tenantId: tenant.id,
    userId: user.id,
    clerkOrgId: input.clerkOrgId,
    clerkUserId: input.clerkUserId,
    role: input.role,
    requestId: input.requestId ?? randomUUID(),
    source: 'web',
    secrets: makeSecretResolver(tenant.id),
  }
}
