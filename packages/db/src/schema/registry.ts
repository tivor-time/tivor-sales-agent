/**
 * Tenant-scoping registry. The DAL iterates `tenantScopedTables` to build the
 * typed scoped repository map (ctx.db.<name>). A type-level `satisfies` check in
 * build-repos.ts forces every registered table to carry a `tenantId` column —
 * registering a global table here is a COMPILE error, and the schema-coverage
 * test asserts no tenant table is forgotten.
 */
import { memberships } from './tenant'
import { catalogItems } from './catalog'
import { leads, contacts, leadProvenance } from './lead'
import { emailIdentities } from './mailbox'
import { campaigns, sequences, sequenceSteps } from './campaign'
import { messages, approvals, inquiries } from './message'
import { listings, listingVersions, samples, followUpTasks, marketBriefs } from './listing'
import { suppressionEntries, auditEvents, usageRecords, subscriptions } from './compliance'
import { tenants, users } from './tenant'

/** Every tenant-owned table, keyed by its repository name (ctx.db.<key>). */
export const tenantScopedTables = {
  memberships,
  catalogItems,
  leads,
  contacts,
  leadProvenance,
  emailIdentities,
  campaigns,
  sequences,
  sequenceSteps,
  messages,
  approvals,
  inquiries,
  listings,
  listingVersions,
  samples,
  followUpTasks,
  marketBriefs,
  suppressionEntries,
  auditEvents,
  usageRecords,
  subscriptions,
}

/** Genuinely cross-tenant tables. Reached only via the resolver, never the DAL. */
export const globalTables = {
  tenants,
  users,
}

export type TenantScopedTables = typeof tenantScopedTables
export type TenantTableName = keyof TenantScopedTables
