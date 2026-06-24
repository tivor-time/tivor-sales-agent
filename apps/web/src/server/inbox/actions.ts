'use server'

import { runInTenant, schema, decrypt } from '@tradepilot/db'
import { and, eq, isNull, inArray, or, desc } from 'drizzle-orm'
import { getMailboxProviderForIdentity } from '@tradepilot/shared/providers/server'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, PreconditionError, type Result } from '@/server/result'

const { messages, inquiries, emailIdentities } = schema

export interface InboxListItem {
  id: string
  subject: string | null
  fromAddress: string | null
  toAddress: string | null
  snippet: string
  receivedAt: string | null
  intent: string | null
  icpScore: number | null
}

export interface InboxMessageDetail {
  id: string
  subject: string | null
  fromAddress: string | null
  toAddress: string | null
  receivedAt: string | null
  bodyHtml: string | null
  bodyText: string | null
  intent: string | null
  icpScore: number | null
  status: string | null
  budget: string | null
  authority: string | null
  need: string | null
  timeline: string | null
  requestedProducts: string[]
}

function snippetOf(text: string | null, html: string | null): string {
  const raw = (text ?? html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return raw.slice(0, 160)
}

const iso = (d: Date | null | undefined): string | null => (d ? new Date(d).toISOString() : null)

/** All received (inbound) mail for the tenant, newest first, with AI classification overlay. */
export async function listInbox(): Promise<Result<InboxListItem[]>> {
  return withAction(async () => {
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      // Scope the inbox to mail belonging to a still-connected mailbox (plus any
      // orphan messages with no owning identity). Disconnecting a mailbox should
      // make its synced mail disappear here; reconnecting (which un-soft-deletes
      // the same identity row) restores it.
      const activeIdentities = await ctx.db.emailIdentities.findMany({
        where: isNull(emailIdentities.deletedAt),
        limit: 100,
      })
      const activeIds = activeIdentities.map((i) => i.id)
      const ownerClause = activeIds.length
        ? or(isNull(messages.emailIdentityId), inArray(messages.emailIdentityId, activeIds))!
        : isNull(messages.emailIdentityId)
      const rows = await ctx.db.messages.findMany({
        where: and(eq(messages.direction, 'inbound'), isNull(messages.deletedAt), ownerClause)!,
        orderBy: desc(messages.receivedAt),
        limit: 200,
      })

      const ids = rows.map((r) => r.id)
      const inq = ids.length
        ? await ctx.db.inquiries.findMany({
            where: and(inArray(inquiries.messageId, ids), isNull(inquiries.deletedAt))!,
            limit: ids.length,
          })
        : []
      const byMsg = new Map(inq.map((i) => [i.messageId, i]))

      return rows.map((r) => {
        const q = byMsg.get(r.id)
        return {
          id: r.id,
          subject: r.subject,
          fromAddress: r.fromAddress,
          toAddress: r.toAddress,
          snippet: snippetOf(r.bodyText, r.bodyHtml),
          receivedAt: iso(r.receivedAt ?? r.createdAt),
          intent: q?.intent ?? null,
          icpScore: q?.icpScore ?? null,
        }
      })
    })
  })
}

/** Full body + AI classification for one inbound message. */
export async function getInboxMessage(input: { id: string }): Promise<Result<InboxMessageDetail>> {
  return withAction(async () => {
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const m = await ctx.db.messages.findById(input.id)
      if (!m || m.direction !== 'inbound' || m.deletedAt) throw new NotFoundError('Message not found.')
      const q = await ctx.db.inquiries.findFirst(
        and(eq(inquiries.messageId, m.id), isNull(inquiries.deletedAt))!,
      )
      return {
        id: m.id,
        subject: m.subject,
        fromAddress: m.fromAddress,
        toAddress: m.toAddress,
        receivedAt: iso(m.receivedAt ?? m.createdAt),
        bodyHtml: m.bodyHtml,
        bodyText: m.bodyText,
        intent: q?.intent ?? null,
        icpScore: q?.icpScore ?? null,
        status: q?.status ?? null,
        budget: q?.budget ?? null,
        authority: q?.authority ?? null,
        need: q?.need ?? null,
        timeline: q?.timeline ?? null,
        requestedProducts: q?.requestedProducts ?? [],
      }
    })
  })
}

/**
 * Reply to an inbound email: send a response to the original sender through the
 * connected mailbox and persist it as a threaded outbound message. Network send
 * happens OUTSIDE any tx.
 */
export async function replyToInbound(
  input: { messageId: string; body: string },
): Promise<Result<{ providerMessageId: string }>> {
  return withAction(async () => {
    const messageId = String(input?.messageId ?? '')
    const body = String(input?.body ?? '').trim()
    if (!messageId || !body) throw new PreconditionError('A reply message is required.')
    const partial = await resolveTenantContext()

    const loaded = await runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const original = await ctx.db.messages.findById(messageId)
      if (!original || original.direction !== 'inbound' || original.deletedAt) {
        throw new NotFoundError('Message not found.')
      }
      const identity = await ctx.db.emailIdentities.findFirst(
        and(eq(emailIdentities.sendingEnabled, true), isNull(emailIdentities.deletedAt))!,
      )
      return { original, identity }
    })

    if (!loaded.identity) {
      throw new PreconditionError('Connect a mailbox and enable sending before replying.')
    }
    const { original, identity } = loaded
    const to = original.fromAddress
    if (!to) throw new PreconditionError('The original message has no sender address.')
    const baseSubject = original.subject ?? ''
    const subject = /^re:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject}`.trim()

    let accessToken: string
    try {
      accessToken = identity.accessTokenEnc ? decrypt(identity.accessTokenEnc, partial.tenantId) : ''
    } catch {
      throw new PreconditionError('Mailbox token is invalid; reconnect the mailbox.')
    }

    const provider = getMailboxProviderForIdentity(identity)
    const result = await provider.send({
      accessToken,
      from: identity.email,
      to,
      subject,
      text: body,
      inReplyTo: original.providerMessageId ?? undefined,
      references: original.references ?? [],
    })

    await runInTenant(partial, async (ctx) => {
      await ctx.db.messages.insert({
        direction: 'outbound',
        status: 'sent',
        fromAddress: identity.email,
        toAddress: to,
        subject,
        bodyText: body,
        providerMessageId: result.providerMessageId,
        threadId: original.threadId ?? null,
        inReplyTo: original.providerMessageId ?? null,
        emailIdentityId: identity.id,
        sentAt: new Date(),
        aiMeta: { reply: true },
      } as never)
    })

    return { providerMessageId: result.providerMessageId }
  })
}
