CREATE TYPE "public"."actor_type" AS ENUM('user', 'system', 'ai');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'auto_approved', 'expired');--> statement-breakpoint
CREATE TYPE "public"."approval_subject" AS ENUM('message', 'campaign', 'listing_version', 'sequence');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'soft_delete', 'restore', 'login', 'send', 'approve', 'reject', 'export', 'import', 'oauth_connect', 'oauth_revoke', 'billing_change');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."context_source" AS ENUM('web', 'worker', 'test');--> statement-breakpoint
CREATE TYPE "public"."dns_verification" AS ENUM('unknown', 'pending', 'pass', 'fail');--> statement-breakpoint
CREATE TYPE "public"."inquiry_intent" AS ENUM('price_request', 'sample_request', 'spec_request', 'moq_request', 'certification_request', 'logistics_request', 'partnership', 'complaint', 'unsubscribe', 'out_of_office', 'not_interested', 'other');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('open', 'triaged', 'responded', 'won', 'lost', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'de', 'es', 'fr', 'pl');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('manual', 'csv_import', 'ai_discovery', 'enrichment', 'inbound_reply', 'referral', 'marketplace');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('new', 'researching', 'qualified', 'contacted', 'engaged', 'negotiating', 'won', 'lost', 'disqualified');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'in_review', 'published', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."mailbox_provider" AS ENUM('gmail', 'microsoft', 'smtp', 'resend');--> statement-breakpoint
CREATE TYPE "public"."marketplace" AS ENUM('alibaba', 'indiamart', 'tradeindia', 'exportersindia', 'ec21', 'go4worldbusiness', 'own_site', 'other');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('outbound', 'inbound');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('draft', 'pending_approval', 'approved', 'queued', 'scheduled', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'received', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'growth', 'scale', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."sample_status" AS ENUM('requested', 'approved', 'preparing', 'shipped', 'delivered', 'feedback_received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."step_channel" AS ENUM('email', 'task', 'wait');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');--> statement-breakpoint
CREATE TYPE "public"."suppression_reason" AS ENUM('unsubscribe', 'hard_bounce', 'spam_complaint', 'manual', 'gdpr_request', 'role_address', 'competitor');--> statement-breakpoint
CREATE TYPE "public"."suppression_scope" AS ENUM('email', 'domain');--> statement-breakpoint
CREATE TYPE "public"."task_cadence" AS ENUM('once', 'daily', 'weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'in_progress', 'done', 'snoozed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."usage_metric" AS ENUM('ai_tokens_in', 'ai_tokens_out', 'ai_message_generation', 'enrichment_lookup', 'lead_discovery', 'email_sent', 'market_brief');--> statement-breakpoint
CREATE TYPE "public"."warmup_state" AS ENUM('not_started', 'warming', 'active', 'paused', 'throttled');--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"default_language" "language" DEFAULT 'en' NOT NULL,
	"target_markets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"company_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sending_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"locale" "language" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"grade" text,
	"packaging" text,
	"hs_code" text,
	"unit" text DEFAULT 'kg' NOT NULL,
	"moq" numeric(12, 2),
	"incoterms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"localized" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_list" jsonb DEFAULT '{"currency":"USD","tiers":[]}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"title" text,
	"phone" text,
	"language" "language" DEFAULT 'en' NOT NULL,
	"linkedin_url" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"consent" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lead_provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"source" "lead_source" NOT NULL,
	"provider" text,
	"source_url" text,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"domain" text,
	"website" text,
	"country" text,
	"region" text,
	"city" text,
	"language" "language" DEFAULT 'en' NOT NULL,
	"industry" text,
	"stage" "lead_stage" DEFAULT 'new' NOT NULL,
	"source" "lead_source" DEFAULT 'manual' NOT NULL,
	"icp_score" integer,
	"enrichment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assigned_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "mailbox_provider" NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"spf_status" "dns_verification" DEFAULT 'unknown' NOT NULL,
	"dkim_status" "dns_verification" DEFAULT 'unknown' NOT NULL,
	"dmarc_status" "dns_verification" DEFAULT 'unknown' NOT NULL,
	"domain_verified_at" timestamp with time zone,
	"sending_enabled" boolean DEFAULT false NOT NULL,
	"warmup_state" "warmup_state" DEFAULT 'not_started' NOT NULL,
	"daily_cap" integer DEFAULT 20 NOT NULL,
	"sent_today" integer DEFAULT 0 NOT NULL,
	"sent_today_reset_at" timestamp with time zone,
	"provider_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"email_identity_id" uuid,
	"targeting" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_language" "language" DEFAULT 'en' NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sequence_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sequence_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"day_offset" integer DEFAULT 0 NOT NULL,
	"channel" "step_channel" DEFAULT 'email' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"subject_template" text,
	"body_template" text,
	"ai_prompt_override" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subject_type" "approval_subject" NOT NULL,
	"subject_id" uuid NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"requested_by_user_id" uuid,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid,
	"contact_id" uuid,
	"message_id" uuid,
	"intent" "inquiry_intent" DEFAULT 'other' NOT NULL,
	"status" "inquiry_status" DEFAULT 'open' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"budget" text,
	"authority" text,
	"need" text,
	"timeline" text,
	"icp_score" integer,
	"requested_products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"extracted" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"direction" "message_direction" NOT NULL,
	"status" "message_status" DEFAULT 'draft' NOT NULL,
	"campaign_id" uuid,
	"sequence_step_id" uuid,
	"lead_id" uuid,
	"contact_id" uuid,
	"email_identity_id" uuid,
	"language" "language" DEFAULT 'en' NOT NULL,
	"locale" text,
	"from_address" text,
	"to_address" text,
	"subject" text,
	"body_text" text,
	"body_html" text,
	"provider_message_id" text,
	"thread_id" text,
	"in_reply_to" text,
	"references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"error_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "follow_up_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"cadence" "task_cadence" DEFAULT 'once' NOT NULL,
	"due_date" timestamp with time zone,
	"lead_id" uuid,
	"contact_id" uuid,
	"assigned_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "listing_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalog_item_id" uuid,
	"marketplace" "marketplace" NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"external_listing_id" text,
	"external_url" text,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "market_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"markets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalog_item_id" uuid,
	"lead_id" uuid,
	"contact_id" uuid,
	"status" "sample_status" DEFAULT 'requested' NOT NULL,
	"recipient_name" text,
	"shipping_address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"sent_date" timestamp with time zone,
	"delivered_date" timestamp with time zone,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"actor_type" "actor_type" DEFAULT 'user' NOT NULL,
	"source" "context_source" DEFAULT 'web' NOT NULL,
	"request_id" text,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scope" "suppression_scope" NOT NULL,
	"value" text NOT NULL,
	"reason" "suppression_reason" NOT NULL,
	"note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric" "usage_metric" NOT NULL,
	"quantity" numeric(18, 4) DEFAULT '0' NOT NULL,
	"idempotency_key" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reported_to_stripe_at" timestamp with time zone,
	"stripe_usage_record_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_provenance" ADD CONSTRAINT "lead_provenance_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_provenance" ADD CONSTRAINT "lead_provenance_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_identities" ADD CONSTRAINT "email_identities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_email_identity_id_email_identities_id_fk" FOREIGN KEY ("email_identity_id") REFERENCES "public"."email_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sequence_id_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sequence_step_id_sequence_steps_id_fk" FOREIGN KEY ("sequence_step_id") REFERENCES "public"."sequence_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_email_identity_id_email_identities_id_fk" FOREIGN KEY ("email_identity_id") REFERENCES "public"."email_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_versions" ADD CONSTRAINT "listing_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_versions" ADD CONSTRAINT "listing_versions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_briefs" ADD CONSTRAINT "market_briefs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_entries" ADD CONSTRAINT "suppression_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_tenant_user_ux" ON "memberships" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_tenant_role_idx" ON "memberships" USING btree ("tenant_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_clerk_org_ux" ON "tenants" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_ux" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_ux" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_ux" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_items_tenant_sku_ux" ON "catalog_items" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "catalog_items_tenant_active_idx" ON "catalog_items" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_tenant_email_ux" ON "contacts" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "contacts_tenant_lead_idx" ON "contacts" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE INDEX "lead_provenance_tenant_lead_idx" ON "lead_provenance" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_tenant_domain_ux" ON "leads" USING btree ("tenant_id","domain");--> statement-breakpoint
CREATE INDEX "leads_tenant_stage_idx" ON "leads" USING btree ("tenant_id","stage");--> statement-breakpoint
CREATE INDEX "leads_tenant_country_idx" ON "leads" USING btree ("tenant_id","country");--> statement-breakpoint
CREATE INDEX "leads_tenant_score_idx" ON "leads" USING btree ("tenant_id","icp_score");--> statement-breakpoint
CREATE UNIQUE INDEX "email_identities_tenant_email_ux" ON "email_identities" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "email_identities_tenant_sendable_idx" ON "email_identities" USING btree ("tenant_id","sending_enabled");--> statement-breakpoint
CREATE INDEX "campaigns_tenant_status_idx" ON "campaigns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_tenant_name_ux" ON "campaigns" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sequence_steps_tenant_seq_order_ux" ON "sequence_steps" USING btree ("tenant_id","sequence_id","step_order");--> statement-breakpoint
CREATE INDEX "sequence_steps_tenant_seq_idx" ON "sequence_steps" USING btree ("tenant_id","sequence_id");--> statement-breakpoint
CREATE INDEX "sequences_tenant_campaign_idx" ON "sequences" USING btree ("tenant_id","campaign_id");--> statement-breakpoint
CREATE INDEX "approvals_tenant_status_idx" ON "approvals" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "approvals_tenant_subject_idx" ON "approvals" USING btree ("tenant_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "inquiries_tenant_status_idx" ON "inquiries" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "inquiries_tenant_intent_idx" ON "inquiries" USING btree ("tenant_id","intent");--> statement-breakpoint
CREATE INDEX "inquiries_tenant_lead_idx" ON "inquiries" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_status_idx" ON "messages" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "messages_tenant_thread_idx" ON "messages" USING btree ("tenant_id","thread_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_lead_idx" ON "messages" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_tenant_provider_msg_ux" ON "messages" USING btree ("tenant_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_scheduled_idx" ON "messages" USING btree ("tenant_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "follow_up_tasks_tenant_status_due_idx" ON "follow_up_tasks" USING btree ("tenant_id","status","due_date");--> statement-breakpoint
CREATE INDEX "follow_up_tasks_tenant_lead_idx" ON "follow_up_tasks" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_versions_tenant_listing_version_ux" ON "listing_versions" USING btree ("tenant_id","listing_id","version");--> statement-breakpoint
CREATE INDEX "listing_versions_tenant_listing_idx" ON "listing_versions" USING btree ("tenant_id","listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_tenant_market_item_ux" ON "listings" USING btree ("tenant_id","marketplace","catalog_item_id","language");--> statement-breakpoint
CREATE INDEX "listings_tenant_status_idx" ON "listings" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "market_briefs_tenant_period_idx" ON "market_briefs" USING btree ("tenant_id","period_start");--> statement-breakpoint
CREATE INDEX "samples_tenant_status_idx" ON "samples" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "samples_tenant_lead_idx" ON "samples" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE INDEX "audit_events_tenant_created_idx" ON "audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_tenant_entity_idx" ON "audit_events" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_tenant_ux" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_stripe_sub_ux" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppression_entries_tenant_scope_value_ux" ON "suppression_entries" USING btree ("tenant_id","scope","value");--> statement-breakpoint
CREATE INDEX "suppression_entries_tenant_value_idx" ON "suppression_entries" USING btree ("tenant_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_records_tenant_idem_ux" ON "usage_records" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "usage_records_tenant_metric_occurred_idx" ON "usage_records" USING btree ("tenant_id","metric","occurred_at");--> statement-breakpoint
CREATE INDEX "usage_records_unreported_idx" ON "usage_records" USING btree ("tenant_id","reported_to_stripe_at");