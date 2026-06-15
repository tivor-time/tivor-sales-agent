import { pgTable, uuid, text, integer, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { id, timestamps, softDelete, tenantId } from './_shared'
import {
  marketplaceEnum,
  listingStatusEnum,
  languageEnum,
  sampleStatusEnum,
  taskStatusEnum,
  taskCadenceEnum,
} from './enums'
import { catalogItems } from './catalog'
import { leads, contacts } from './lead'
import { users } from './tenant'

/** A product listing on a marketplace (the head/current pointer). */
export const listings = pgTable(
  'listings',
  {
    id: id(),
    tenantId: tenantId(),
    catalogItemId: uuid('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    marketplace: marketplaceEnum('marketplace').notNull(),
    language: languageEnum('language').notNull().default('en'),
    externalListingId: text('external_listing_id'),
    externalUrl: text('external_url'),
    status: listingStatusEnum('status').notNull().default('draft'),
    currentVersion: integer('current_version').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantMarketItemUx: uniqueIndex('listings_tenant_market_item_ux').on(
      t.tenantId,
      t.marketplace,
      t.catalogItemId,
      t.language,
    ),
    tenantStatusIdx: index('listings_tenant_status_idx').on(t.tenantId, t.status),
  }),
)

/** Immutable content snapshots per listing (versioned, approval-gated). */
export const listingVersions = pgTable(
  'listing_versions',
  {
    id: id(),
    tenantId: tenantId(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: listingStatusEnum('status').notNull().default('draft'),
    content: jsonb('content')
      .$type<{
        title?: string
        description?: string
        keywords?: string[]
        attributes?: Record<string, unknown>
        media?: string[]
      }>()
      .notNull()
      .default({}),
    aiMeta: jsonb('ai_meta').$type<Record<string, unknown>>().notNull().default({}),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    tenantListingVersionUx: uniqueIndex('listing_versions_tenant_listing_version_ux').on(
      t.tenantId,
      t.listingId,
      t.version,
    ),
    tenantListingIdx: index('listing_versions_tenant_listing_idx').on(t.tenantId, t.listingId),
  }),
)

/** Physical product samples shipped to prospects. */
export const samples = pgTable(
  'samples',
  {
    id: id(),
    tenantId: tenantId(),
    catalogItemId: uuid('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    status: sampleStatusEnum('status').notNull().default('requested'),
    recipientName: text('recipient_name'),
    shippingAddress: jsonb('shipping_address').$type<Record<string, string>>().notNull().default({}),
    carrier: text('carrier'),
    trackingNumber: text('tracking_number'),
    sentDate: timestamp('sent_date', { withTimezone: true }),
    deliveredDate: timestamp('delivered_date', { withTimezone: true }),
    feedback: text('feedback'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantStatusIdx: index('samples_tenant_status_idx').on(t.tenantId, t.status),
    tenantLeadIdx: index('samples_tenant_lead_idx').on(t.tenantId, t.leadId),
  }),
)

/** Follow-up tasks (manual + AI-suggested). */
export const followUpTasks = pgTable(
  'follow_up_tasks',
  {
    id: id(),
    tenantId: tenantId(),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('open'),
    cadence: taskCadenceEnum('cadence').notNull().default('once'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantStatusDueIdx: index('follow_up_tasks_tenant_status_due_idx').on(
      t.tenantId,
      t.status,
      t.dueDate,
    ),
    tenantLeadIdx: index('follow_up_tasks_tenant_lead_idx').on(t.tenantId, t.leadId),
  }),
)

/** AI-generated market intelligence brief. */
export const marketBriefs = pgTable(
  'market_briefs',
  {
    id: id(),
    tenantId: tenantId(),
    title: text('title').notNull(),
    markets: jsonb('markets').$type<string[]>().notNull().default([]),
    language: languageEnum('language').notNull().default('en'),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
    citations: jsonb('citations')
      .$type<{ title?: string; url?: string; snippet?: string }[]>()
      .notNull()
      .default([]),
    aiMeta: jsonb('ai_meta').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantPeriodIdx: index('market_briefs_tenant_period_idx').on(t.tenantId, t.periodStart),
  }),
)
