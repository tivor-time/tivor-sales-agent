import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { id, timestamps, tenantId } from './_shared'
import {
  suppressionScopeEnum,
  suppressionReasonEnum,
  usageMetricEnum,
  planEnum,
  subscriptionStatusEnum,
  auditActionEnum,
  actorTypeEnum,
  contextSourceEnum,
} from './enums'
import { users } from './tenant'

/** Do-not-contact list (email or domain), per tenant. */
export const suppressionEntries = pgTable(
  'suppression_entries',
  {
    id: id(),
    tenantId: tenantId(),
    scope: suppressionScopeEnum('scope').notNull(),
    value: text('value').notNull(), // normalized lowercased email or domain
    reason: suppressionReasonEnum('reason').notNull(),
    note: text('note'),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // null = permanent
    ...timestamps,
  },
  (t) => ({
    tenantScopeValueUx: uniqueIndex('suppression_entries_tenant_scope_value_ux').on(
      t.tenantId,
      t.scope,
      t.value,
    ),
    tenantValueIdx: index('suppression_entries_tenant_value_idx').on(t.tenantId, t.value),
  }),
)

/** Immutable audit trail. Append-only (no soft-delete). */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: id(),
    tenantId: tenantId(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorType: actorTypeEnum('actor_type').notNull().default('user'),
    // Source of the tenant context that produced the event.
    source: contextSourceEnum('source').notNull().default('web'),
    requestId: text('request_id'),
    action: auditActionEnum('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    before: jsonb('before').$type<Record<string, unknown>>(),
    after: jsonb('after').$type<Record<string, unknown>>(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantCreatedIdx: index('audit_events_tenant_created_idx').on(t.tenantId, t.createdAt),
    tenantEntityIdx: index('audit_events_tenant_entity_idx').on(
      t.tenantId,
      t.entityType,
      t.entityId,
    ),
  }),
)

/** Metered usage rows aggregated/reported to Stripe. */
export const usageRecords = pgTable(
  'usage_records',
  {
    id: id(),
    tenantId: tenantId(),
    metric: usageMetricEnum('metric').notNull(),
    quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
    // Idempotency key so retried Inngest steps don't double-count.
    idempotencyKey: text('idempotency_key').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    reportedToStripeAt: timestamp('reported_to_stripe_at', { withTimezone: true }),
    stripeUsageRecordId: text('stripe_usage_record_id'),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => ({
    tenantIdemUx: uniqueIndex('usage_records_tenant_idem_ux').on(t.tenantId, t.idempotencyKey),
    tenantMetricOccurredIdx: index('usage_records_tenant_metric_occurred_idx').on(
      t.tenantId,
      t.metric,
      t.occurredAt,
    ),
    unreportedIdx: index('usage_records_unreported_idx').on(t.tenantId, t.reportedToStripeAt),
  }),
)

/** One Stripe subscription per tenant (1:1). */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    tenantId: tenantId(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    plan: planEnum('plan').notNull().default('free'),
    status: subscriptionStatusEnum('status').notNull().default('trialing'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    limits: jsonb('limits').$type<Record<string, number>>().notNull().default({}),
    ...timestamps,
  },
  (t) => ({
    tenantUx: uniqueIndex('subscriptions_tenant_ux').on(t.tenantId),
    stripeSubUx: uniqueIndex('subscriptions_stripe_sub_ux').on(t.stripeSubscriptionId),
  }),
)
