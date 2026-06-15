import { pgTable, uuid, text, timestamp, jsonb, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { id, timestamps, softDelete, tenantId } from './_shared'
import {
  messageDirectionEnum,
  messageStatusEnum,
  languageEnum,
  approvalStatusEnum,
  approvalSubjectEnum,
  inquiryIntentEnum,
  inquiryStatusEnum,
} from './enums'
import { leads, contacts } from './lead'
import { campaigns, sequenceSteps } from './campaign'
import { emailIdentities } from './mailbox'
import { users } from './tenant'

/** Every outbound draft/queued/sent and inbound received email. */
export const messages = pgTable(
  'messages',
  {
    id: id(),
    tenantId: tenantId(),
    direction: messageDirectionEnum('direction').notNull(),
    status: messageStatusEnum('status').notNull().default('draft'),

    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    sequenceStepId: uuid('sequence_step_id').references(() => sequenceSteps.id, {
      onDelete: 'set null',
    }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    emailIdentityId: uuid('email_identity_id').references(() => emailIdentities.id, {
      onDelete: 'set null',
    }),

    language: languageEnum('language').notNull().default('en'),
    locale: text('locale'),
    fromAddress: text('from_address'),
    toAddress: text('to_address'),
    subject: text('subject'),
    bodyText: text('body_text'),
    bodyHtml: text('body_html'),

    providerMessageId: text('provider_message_id'),
    threadId: text('thread_id'),
    inReplyTo: text('in_reply_to'),
    references: jsonb('references').$type<string[]>().notNull().default([]),

    aiMeta: jsonb('ai_meta')
      .$type<{ model?: string; tokensIn?: number; tokensOut?: number }>()
      .notNull()
      .default({}),

    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    errorReason: text('error_reason'),

    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantStatusIdx: index('messages_tenant_status_idx').on(t.tenantId, t.status),
    tenantThreadIdx: index('messages_tenant_thread_idx').on(t.tenantId, t.threadId),
    tenantLeadIdx: index('messages_tenant_lead_idx').on(t.tenantId, t.leadId),
    tenantProviderMsgUx: uniqueIndex('messages_tenant_provider_msg_ux').on(
      t.tenantId,
      t.providerMessageId,
    ),
    tenantScheduledIdx: index('messages_tenant_scheduled_idx').on(t.tenantId, t.scheduledAt),
  }),
)

/** Human-in-the-loop gate for messages/campaigns/listings/sequences. */
export const approvals = pgTable(
  'approvals',
  {
    id: id(),
    tenantId: tenantId(),
    subjectType: approvalSubjectEnum('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(), // polymorphic FK (validated in DAL)
    status: approvalStatusEnum('status').notNull().default('pending'),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    note: text('note'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    tenantStatusIdx: index('approvals_tenant_status_idx').on(t.tenantId, t.status),
    tenantSubjectIdx: index('approvals_tenant_subject_idx').on(
      t.tenantId,
      t.subjectType,
      t.subjectId,
    ),
  }),
)

/** Inbound buyer inquiry, classified by Claude (intent + BANT/ICP). */
export const inquiries = pgTable(
  'inquiries',
  {
    id: id(),
    tenantId: tenantId(),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
    intent: inquiryIntentEnum('intent').notNull().default('other'),
    status: inquiryStatusEnum('status').notNull().default('open'),
    language: languageEnum('language').notNull().default('en'),
    budget: text('budget'),
    authority: text('authority'),
    need: text('need'),
    timeline: text('timeline'),
    icpScore: integer('icp_score'),
    requestedProducts: jsonb('requested_products').$type<string[]>().notNull().default([]),
    extracted: jsonb('extracted').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantStatusIdx: index('inquiries_tenant_status_idx').on(t.tenantId, t.status),
    tenantIntentIdx: index('inquiries_tenant_intent_idx').on(t.tenantId, t.intent),
    tenantLeadIdx: index('inquiries_tenant_lead_idx').on(t.tenantId, t.leadId),
  }),
)
