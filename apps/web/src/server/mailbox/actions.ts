'use server'

import { runInTenant, schema } from '@tradepilot/db'
import { isNull, desc } from 'drizzle-orm'
import { expectedDnsRecords, type DnsRecord } from '@tradepilot/shared/deliverability'
import { resolveDomainAuth, domainFromEmail } from '@tradepilot/shared/providers/server'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, PreconditionError, type Result } from '@/server/result'
import { toMailboxDTO, type MailboxDTO } from './dto'
import { mailboxIdSchema, setSendingSchema } from './schemas'

const { emailIdentities } = schema

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
      if (enabled && !row.domainVerifiedAt) {
        throw new PreconditionError('Verify domain authentication before enabling sending.')
      }
      await ctx.db.emailIdentities.update(id, { sendingEnabled: enabled })
      return { id }
    })
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
