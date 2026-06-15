import { pgTable, uuid, text, integer, jsonb, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { id, timestamps, softDelete, tenantId } from './_shared'
import { leadStageEnum, leadSourceEnum, languageEnum } from './enums'

/** A company (the account). */
export const leads = pgTable(
  'leads',
  {
    id: id(),
    tenantId: tenantId(),
    companyName: text('company_name').notNull(),
    domain: text('domain'), // normalized lowercase apex domain
    website: text('website'),
    country: text('country'), // ISO-3166 alpha-2
    region: text('region'),
    city: text('city'),
    language: languageEnum('language').notNull().default('en'),
    industry: text('industry'),
    stage: leadStageEnum('stage').notNull().default('new'),
    source: leadSourceEnum('source').notNull().default('manual'),
    icpScore: integer('icp_score'), // 0-100
    enrichment: jsonb('enrichment').$type<Record<string, unknown>>().notNull().default({}),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    assignedUserId: uuid('assigned_user_id'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantDomainUx: uniqueIndex('leads_tenant_domain_ux').on(t.tenantId, t.domain),
    tenantStageIdx: index('leads_tenant_stage_idx').on(t.tenantId, t.stage),
    tenantCountryIdx: index('leads_tenant_country_idx').on(t.tenantId, t.country),
    tenantScoreIdx: index('leads_tenant_score_idx').on(t.tenantId, t.icpScore),
  }),
)

/** A person at a lead company. */
export const contacts = pgTable(
  'contacts',
  {
    id: id(),
    tenantId: tenantId(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    email: text('email'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    title: text('title'),
    phone: text('phone'),
    language: languageEnum('language').notNull().default('en'),
    linkedinUrl: text('linkedin_url'),
    isPrimary: boolean('is_primary').notNull().default(false),
    consent: jsonb('consent')
      .$type<{ optedOut?: boolean; basis?: string; capturedAt?: string }>()
      .notNull()
      .default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantEmailUx: uniqueIndex('contacts_tenant_email_ux').on(t.tenantId, t.email),
    tenantLeadIdx: index('contacts_tenant_lead_idx').on(t.tenantId, t.leadId),
  }),
)

/** Provenance of how a lead was discovered or enriched. Append-only. */
export const leadProvenance = pgTable(
  'lead_provenance',
  {
    id: id(),
    tenantId: tenantId(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    source: leadSourceEnum('source').notNull(),
    provider: text('provider'),
    sourceUrl: text('source_url'),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull().default({}),
    confidence: integer('confidence'), // 0-100
    ...timestamps,
  },
  (t) => ({
    tenantLeadIdx: index('lead_provenance_tenant_lead_idx').on(t.tenantId, t.leadId),
  }),
)
