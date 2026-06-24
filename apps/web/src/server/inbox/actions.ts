'use server'

import { runInTenant, schema } from '@tradepilot/db'
import { and, eq, isNull, inArray, desc } from 'drizzle-orm'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, type Result } from '@/server/result'

const { messages, inquiries } = schema

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
      const rows = await ctx.db.messages.findMany({
        where: and(eq(messages.direction, 'inbound'), isNull(messages.deletedAt))!,
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
