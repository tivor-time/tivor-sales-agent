import { pgTable, uuid, text, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { id, timestamps, softDelete } from './_shared'
import { languageEnum, memberRoleEnum } from './enums'

/** ROOT. Maps 1:1 to a Clerk Organization. */
export const tenants = pgTable(
  'tenants',
  {
    id: id(),
    // Clerk org id — the external source of truth for tenancy.
    clerkOrgId: text('clerk_org_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    defaultLanguage: languageEnum('default_language').notNull().default('en'),
    targetMarkets: jsonb('target_markets').$type<string[]>().notNull().default([]),
    companyProfile: jsonb('company_profile')
      .$type<{
        legalName?: string
        website?: string
        certifications?: string[]
        about?: string
        timezone?: string
        physicalAddress?: string
      }>()
      .notNull()
      .default({}),
    // Global kill-switch: sending stays OFF until domain auth verifies.
    sendingEnabled: boolean('sending_enabled').notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    clerkOrgUx: uniqueIndex('tenants_clerk_org_ux').on(t.clerkOrgId),
    slugUx: uniqueIndex('tenants_slug_ux').on(t.slug),
  }),
)

/** Users are global identities (Clerk users); membership scopes them per tenant. */
export const users = pgTable(
  'users',
  {
    id: id(),
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    imageUrl: text('image_url'),
    locale: languageEnum('locale').notNull().default('en'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    clerkUserUx: uniqueIndex('users_clerk_user_ux').on(t.clerkUserId),
    emailUx: uniqueIndex('users_email_ux').on(t.email),
  }),
)

/** Join table: which user has which role in which tenant. tenant-scoped. */
export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('member'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantUserUx: uniqueIndex('memberships_tenant_user_ux').on(t.tenantId, t.userId),
    tenantRoleIdx: index('memberships_tenant_role_idx').on(t.tenantId, t.role),
  }),
)
