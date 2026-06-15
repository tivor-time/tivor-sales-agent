import { pgTable, text, integer, timestamp, boolean, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { id, timestamps, softDelete, tenantId } from './_shared'
import { mailboxProviderEnum, warmupStateEnum, dnsVerificationEnum } from './enums'

/**
 * A connected sending/receiving mailbox.
 * CIPHERTEXT columns: accessTokenEnc, refreshTokenEnc — encrypted at rest with
 * the master key + tenantId AAD. Decrypted only in the worker; web never loads
 * raw tokens. Sending stays OFF until SPF/DKIM/DMARC all pass.
 */
export const emailIdentities = pgTable(
  'email_identities',
  {
    id: id(),
    tenantId: tenantId(),
    provider: mailboxProviderEnum('provider').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name'),

    // --- ENCRYPTED OAUTH SECRETS (ciphertext) ---
    accessTokenEnc: text('access_token_enc'),
    refreshTokenEnc: text('refresh_token_enc'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopes: jsonb('scopes').$type<string[]>().notNull().default([]),

    // --- SENDING GATE & DOMAIN AUTH ---
    spfStatus: dnsVerificationEnum('spf_status').notNull().default('unknown'),
    dkimStatus: dnsVerificationEnum('dkim_status').notNull().default('unknown'),
    dmarcStatus: dnsVerificationEnum('dmarc_status').notNull().default('unknown'),
    domainVerifiedAt: timestamp('domain_verified_at', { withTimezone: true }),
    // Hard gate: identity cannot send until true (requires all DNS = pass).
    sendingEnabled: boolean('sending_enabled').notNull().default(false),

    // --- THROTTLING / WARMUP ---
    warmupState: warmupStateEnum('warmup_state').notNull().default('not_started'),
    dailyCap: integer('daily_cap').notNull().default(20),
    sentToday: integer('sent_today').notNull().default(0),
    sentTodayResetAt: timestamp('sent_today_reset_at', { withTimezone: true }),

    // Provider-specific webhook/watch state (Gmail historyId, Graph subscription).
    providerState: jsonb('provider_state').$type<Record<string, unknown>>().notNull().default({}),

    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantEmailUx: uniqueIndex('email_identities_tenant_email_ux').on(t.tenantId, t.email),
    tenantSendableIdx: index('email_identities_tenant_sendable_idx').on(
      t.tenantId,
      t.sendingEnabled,
    ),
  }),
)
