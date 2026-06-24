'use server'

import { runInTenant, schema, decrypt } from '@tradepilot/db'
import { and, eq, isNull, desc } from 'drizzle-orm'
import { flags } from '@tradepilot/shared/env'
import { expectedDnsRecords, type DnsRecord } from '@tradepilot/shared/deliverability'
import {
  resolveDomainAuth,
  domainFromEmail,
  getMailboxProviderForIdentity,
} from '@tradepilot/shared/providers/server'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { sendEvent } from '@/lib/inngest/client'
import { withAction, NotFoundError, PreconditionError, type Result } from '@/server/result'
import { toMailboxDTO, type MailboxDTO } from './dto'
import { mailboxIdSchema, setSendingSchema } from './schemas'

const { emailIdentities, messages } = schema

/** All connected (non-deleted) mailboxes for the tenant. Never leaks ciphertext. */
export async function listMailboxes(): Promise<Result<MailboxDTO[]>> {
  return withAction(async () => {
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const rows = await ctx.db.emailIdentities.findMany({
        where: isNull(emailIdentities.deletedAt),
        orderBy: desc(emailIdentities.createdAt),
        limit: 50,
      })
      return rows.map(toMailboxDTO)
    })
  })
}

/** The DNS records the tenant must publish to authenticate this mailbox's domain. */
export async function getDomainAuthRecords(input: unknown): Promise<Result<DnsRecord[]>> {
  return withAction(async () => {
    const { id } = mailboxIdSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const row = await ctx.db.emailIdentities.findById(id)
      if (!row) throw new NotFoundError('Mailbox not found.')
      return expectedDnsRecords(row.provider, domainFromEmail(row.email))
    })
  })
}

/**
 * Resolve DNS + verify SPF/DKIM/DMARC, persist the per-record statuses, and flip
 * sendingEnabled to whether all three pass. The DNS lookup runs OUTSIDE the tx.
 * This is the single place the hard send-gate is allowed to turn ON.
 */
export async function verifyDomainAuth(
  input: unknown,
): Promise<Result<{ verified: boolean; spf: string; dkim: string; dmarc: string }>> {
  return withAction(async () => {
    const { id } = mailboxIdSchema.parse(input)
    const partial = await resolveTenantContext()

    const identity = await runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      const row = await ctx.db.emailIdentities.findById(id)
      if (!row) throw new NotFoundError('Mailbox not found.')
      return { provider: row.provider, email: row.email }
    })

    const result = await resolveDomainAuth(identity.provider, domainFromEmail(identity.email))

    await runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      await ctx.db.emailIdentities.update(id, {
        spfStatus: result.spf,
        dkimStatus: result.dkim,
        dmarcStatus: result.dmarc,
        domainVerifiedAt: result.verified ? new Date() : null,
        sendingEnabled: result.verified,
      })
    })

    return { verified: result.verified, spf: result.spf, dkim: result.dkim, dmarc: result.dmarc }
  })
}

/** Toggle sending for a mailbox. Enabling requires verified domain auth (hard gate). */
export async function setMailboxSending(input: unknown): Promise<Result<{ id: string }>> {
  return withAction(async () => {
    const { id, enabled } = setSendingSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      const row = await ctx.db.emailIdentities.findById(id)
      if (!row) throw new NotFoundError('Mailbox not found.')
      if (enabled && !row.domainVerifiedAt && !flags.isDomainAuthBypassEnabled) {
        throw new PreconditionError('Verify domain authentication before enabling sending.')
      }
      await ctx.db.emailIdentities.update(id, { sendingEnabled: enabled })
      return { id }
    })
  })
}

/**
 * Sync inbound mail for every connected mailbox — INLINE (does the fetch + persist
 * in this request), so it works whether or not the background worker / Inngest dev
 * server is running. Network fetch happens OUTSIDE any tx; each message is inserted
 * idempotently in its own tx (mirrors the poll worker). Classification (triage into
 * the Inquiry Inbox) is still emitted to the worker best-effort — if the worker is
 * down the mail still lands in the inbox, it just isn't auto-triaged yet.
 */
export async function syncInbox(): Promise<Result<{ mailboxes: number; fetched: number }>> {
  return withAction(async () => {
    const partial = await resolveTenantContext()

    const identities = await runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      return ctx.db.emailIdentities.findMany({
        where: isNull(emailIdentities.deletedAt),
        limit: 50,
      })
    })

    let fetched = 0
    const fresh: { emailIdentityId: string; providerMessageId: string }[] = []

    for (const identity of identities) {
      const provider = getMailboxProviderForIdentity(identity)
      if (!provider.receive) continue

      let accessToken: string
      try {
        accessToken = identity.accessTokenEnc ? decrypt(identity.accessTokenEnc, partial.tenantId) : ''
      } catch {
        continue
      }

      let result
      try {
        // OUTSIDE any tx (never hold a transaction across network I/O).
        result = await provider.receive({
          accessToken,
          providerState: identity.providerState ?? {},
          maxMessages: 50,
        })
      } catch {
        continue
      }

      for (const m of result.messages) {
        try {
          const inserted = await runInTenant(partial, async (ctx) => {
            const existing = await ctx.db.messages.findFirst(
              and(
                eq(messages.providerMessageId, m.providerMessageId),
                eq(messages.direction, 'inbound'),
              )!,
            )
            if (existing) return false
            await ctx.db.messages.insert({
              direction: 'inbound',
              status: 'received',
              fromAddress: m.from,
              toAddress: m.to[0] ?? null,
              subject: m.subject,
              bodyText: m.text,
              bodyHtml: m.html ?? null,
              providerMessageId: m.providerMessageId,
              threadId: m.threadId ?? null,
              inReplyTo: m.inReplyTo ?? null,
              references: m.references,
              receivedAt: m.receivedAt,
              emailIdentityId: identity.id,
            } as never)
            return true
          })
          if (inserted) {
            fetched += 1
            fresh.push({ emailIdentityId: identity.id, providerMessageId: m.providerMessageId })
          }
        } catch {
          // Unique race (already ingested) — ignore.
        }
      }

      await runInTenant(partial, async (ctx) => {
        await ctx.db.emailIdentities.update(identity.id, { providerState: result.providerState })
      })
    }

    // Best-effort AI triage (worker). Swallowed if the dev server is down.
    for (const f of fresh) {
      await sendEvent('email/inbound.received', {
        tenantId: partial.tenantId,
        actorUserId: partial.userId,
        emailIdentityId: f.emailIdentityId,
        providerMessageId: f.providerMessageId,
      })
    }

    return { mailboxes: identities.length, fetched }
  })
}

/** Soft-disconnect a mailbox (also turns sending off). */
export async function disconnectMailbox(input: unknown): Promise<Result<{ id: string }>> {
  return withAction(async () => {
    const { id } = mailboxIdSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      const row = await ctx.db.emailIdentities.update(id, {
        deletedAt: new Date(),
        sendingEnabled: false,
      })
      if (!row) throw new NotFoundError('Mailbox not found.')
      return { id }
    })
  })
}
