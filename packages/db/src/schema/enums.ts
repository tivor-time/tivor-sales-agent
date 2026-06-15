import { pgEnum } from 'drizzle-orm/pg-core'

// Languages supported by the seed tenant + English fallback.
export const languageEnum = pgEnum('language', ['en', 'de', 'es', 'fr', 'pl'])

// Org membership roles (Clerk role mirror).
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member'])

// Lead lifecycle / pipeline stage.
export const leadStageEnum = pgEnum('lead_stage', [
  'new',
  'researching',
  'qualified',
  'contacted',
  'engaged',
  'negotiating',
  'won',
  'lost',
  'disqualified',
])

// Where a lead/provenance record came from.
export const leadSourceEnum = pgEnum('lead_source', [
  'manual',
  'csv_import',
  'ai_discovery',
  'enrichment',
  'inbound_reply',
  'referral',
  'marketplace',
])

// Email identity / mailbox provider.
export const mailboxProviderEnum = pgEnum('mailbox_provider', [
  'gmail',
  'microsoft',
  'smtp',
  'resend',
])

// Mailbox warmup lifecycle.
export const warmupStateEnum = pgEnum('warmup_state', [
  'not_started',
  'warming',
  'active',
  'paused',
  'throttled',
])

// Domain-auth verification result per record (SPF/DKIM/DMARC each).
export const dnsVerificationEnum = pgEnum('dns_verification', [
  'unknown',
  'pending',
  'pass',
  'fail',
])

// Campaign lifecycle.
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'scheduled',
  'active',
  'paused',
  'completed',
  'archived',
])

// Sequence step channel (extensible; email-only in Phase 0).
export const stepChannelEnum = pgEnum('step_channel', ['email', 'task', 'wait'])

// Message direction.
export const messageDirectionEnum = pgEnum('message_direction', ['outbound', 'inbound'])

// Message status (covers draft -> queued -> sent and received/bounced/etc).
export const messageStatusEnum = pgEnum('message_status', [
  'draft',
  'pending_approval',
  'approved',
  'queued',
  'scheduled',
  'sending',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'replied',
  'bounced',
  'failed',
  'received',
  'suppressed',
])

// Approval workflow status.
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
  'auto_approved',
  'expired',
])

// What kind of object an approval gates.
export const approvalSubjectEnum = pgEnum('approval_subject', [
  'message',
  'campaign',
  'listing_version',
  'sequence',
])

// Inbound inquiry intent (Claude-classified).
export const inquiryIntentEnum = pgEnum('inquiry_intent', [
  'price_request',
  'sample_request',
  'spec_request',
  'moq_request',
  'certification_request',
  'logistics_request',
  'partnership',
  'complaint',
  'unsubscribe',
  'out_of_office',
  'not_interested',
  'other',
])

// Inquiry handling status.
export const inquiryStatusEnum = pgEnum('inquiry_status', [
  'open',
  'triaged',
  'responded',
  'won',
  'lost',
  'ignored',
])

// Marketplace / listing channel.
export const marketplaceEnum = pgEnum('marketplace', [
  'alibaba',
  'indiamart',
  'tradeindia',
  'exportersindia',
  'ec21',
  'go4worldbusiness',
  'own_site',
  'other',
])

// Listing version status.
export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'in_review',
  'published',
  'rejected',
  'archived',
])

// Sample shipment status.
export const sampleStatusEnum = pgEnum('sample_status', [
  'requested',
  'approved',
  'preparing',
  'shipped',
  'delivered',
  'feedback_received',
  'cancelled',
])

// Follow-up task status.
export const taskStatusEnum = pgEnum('task_status', [
  'open',
  'in_progress',
  'done',
  'snoozed',
  'cancelled',
])

// Follow-up cadence hint.
export const taskCadenceEnum = pgEnum('task_cadence', [
  'once',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
])

// Suppression scope + reason.
export const suppressionScopeEnum = pgEnum('suppression_scope', ['email', 'domain'])
export const suppressionReasonEnum = pgEnum('suppression_reason', [
  'unsubscribe',
  'hard_bounce',
  'spam_complaint',
  'manual',
  'gdpr_request',
  'role_address',
  'competitor',
])

// Usage metric for Stripe metered billing.
export const usageMetricEnum = pgEnum('usage_metric', [
  'ai_tokens_in',
  'ai_tokens_out',
  'ai_message_generation',
  'enrichment_lookup',
  'lead_discovery',
  'email_sent',
  'market_brief',
])

// Subscription plan + status (mirrors Stripe).
export const planEnum = pgEnum('plan', ['free', 'starter', 'growth', 'scale', 'enterprise'])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
])

// Audit event action verbs.
export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'soft_delete',
  'restore',
  'login',
  'send',
  'approve',
  'reject',
  'export',
  'import',
  'oauth_connect',
  'oauth_revoke',
  'billing_change',
])

// Actor type on an audit event.
export const actorTypeEnum = pgEnum('actor_type', ['user', 'system', 'ai'])

// Source of a tenant context (recorded on audit events).
export const contextSourceEnum = pgEnum('context_source', ['web', 'worker', 'test'])
