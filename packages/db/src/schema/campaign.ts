import { pgTable, uuid, text, integer, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { id, timestamps, softDelete, tenantId } from './_shared'
import { campaignStatusEnum, stepChannelEnum, languageEnum } from './enums'
import { emailIdentities } from './mailbox'

export const campaigns = pgTable(
  'campaigns',
  {
    id: id(),
    tenantId: tenantId(),
    name: text('name').notNull(),
    status: campaignStatusEnum('status').notNull().default('draft'),
    emailIdentityId: uuid('email_identity_id').references(() => emailIdentities.id, {
      onDelete: 'set null',
    }),
    targeting: jsonb('targeting').$type<Record<string, unknown>>().notNull().default({}),
    defaultLanguage: languageEnum('default_language').notNull().default('en'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantStatusIdx: index('campaigns_tenant_status_idx').on(t.tenantId, t.status),
    tenantNameUx: uniqueIndex('campaigns_tenant_name_ux').on(t.tenantId, t.name),
  }),
)

export const sequences = pgTable(
  'sequences',
  {
    id: id(),
    tenantId: tenantId(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    language: languageEnum('language').notNull().default('en'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantCampaignIdx: index('sequences_tenant_campaign_idx').on(t.tenantId, t.campaignId),
  }),
)

export const sequenceSteps = pgTable(
  'sequence_steps',
  {
    id: id(),
    tenantId: tenantId(),
    sequenceId: uuid('sequence_id')
      .notNull()
      .references(() => sequences.id, { onDelete: 'cascade' }),
    stepOrder: integer('step_order').notNull(), // 1-based ordinal
    dayOffset: integer('day_offset').notNull().default(0),
    channel: stepChannelEnum('channel').notNull().default('email'),
    language: languageEnum('language').notNull().default('en'),
    subjectTemplate: text('subject_template'),
    bodyTemplate: text('body_template'),
    aiPromptOverride: text('ai_prompt_override'),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantSeqOrderUx: uniqueIndex('sequence_steps_tenant_seq_order_ux').on(
      t.tenantId,
      t.sequenceId,
      t.stepOrder,
    ),
    tenantSeqIdx: index('sequence_steps_tenant_seq_idx').on(t.tenantId, t.sequenceId),
  }),
)
