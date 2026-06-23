import { parseEvent } from '@tradepilot/shared'
import { runInTenant, schema } from '@tradepilot/db'
import { and, eq, isNull } from 'drizzle-orm'
import { inngest } from '../client'
import { resolveWorkerTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'
import { classifyInbound } from '../lib/ai/classify'

export const EVENT = 'email/inbound.received' as const

const { messages, inquiries, contacts, leads, suppressionEntries } = schema

function apexDomain(email: string): string | undefined {
  const d = email.toLowerCase().split('@')[1]
  return d || undefined
}

/**
 * Triage one inbound message: match it to an existing lead/contact/thread,
 * classify it (AI or heuristic), and create an inquiry. Idempotent — re-emitting
 * the event for an already-triaged message is a no-op.
 */
export async function handleEmailInboundReceived(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)
  const partial = await resolveWorkerTenant({
    tenantId: data.tenantId,
    actorUserId: data.actorUserId,
    requestId,
  })
  if (!partial) return

  // Load the inbound message + match lead/contact (one read tx); bail if already triaged.
  const loaded = await runInTenant(partial, async (ctx) => {
    const message = await ctx.db.messages.findFirst(
      and(eq(messages.providerMessageId, data.providerMessageId), eq(messages.direction, 'inbound'))!,
    )
    if (!message) return null
    const already = await ctx.db.inquiries.findFirst(eq(inquiries.messageId, message.id))
    if (already) return null

    let leadId: string | null = message.leadId ?? null
    let contactId: string | null = message.contactId ?? null
    const from = (message.fromAddress ?? '').toLowerCase()

    // (1) thread continuity: an inbound reply to one of our outbound messages.
    if ((!leadId || !contactId) && (message.inReplyTo || message.references.length)) {
      const refs = [message.inReplyTo, ...message.references].filter((x): x is string => !!x)
      for (const ref of refs) {
        const prior = await ctx.db.messages.findFirst(eq(messages.providerMessageId, ref))
        if (prior) {
          leadId = leadId ?? prior.leadId
          contactId = contactId ?? prior.contactId
          break
        }
      }
    }
    // (2) sender email -> contact (+ its lead).
    if (!contactId && from) {
      const contact = await ctx.db.contacts.findFirst(
        and(eq(contacts.email, from), isNull(contacts.deletedAt))!,
      )
      if (contact) {
        contactId = contact.id
        leadId = leadId ?? contact.leadId
      }
    }
    // (3) sender apex domain -> lead.
    if (!leadId && from) {
      const dom = apexDomain(from)
      if (dom) {
        const lead = await ctx.db.leads.findFirst(
          and(eq(leads.domain, dom), isNull(leads.deletedAt))!,
        )
        if (lead) leadId = lead.id
      }
    }
    return { message, leadId, contactId }
  })
  if (!loaded) return

  const { message, leadId, contactId } = loaded
  const c = await classifyInbound({
    subject: message.subject ?? '',
    bodyText: message.bodyText ?? '',
    fromAddress: message.fromAddress ?? undefined,
  })

  await runInTenant(partial, async (ctx) => {
    await ctx.db.inquiries.insert({
      messageId: message.id,
      leadId,
      contactId,
      intent: c.intent,
      status: 'triaged',
      language: c.language,
      budget: c.budget,
      authority: c.authority,
      need: c.need,
      timeline: c.timeline,
      icpScore: c.icpScore,
      requestedProducts: c.requestedProducts,
      extracted: {
        summary: c.summary,
        classifiedByAi: c.classifiedByAi,
        model: c.model ?? null,
        tokensIn: c.tokensIn ?? null,
        tokensOut: c.tokensOut ?? null,
      },
    } as never)
    await ctx.db.messages.update(message.id, {
      aiMeta: {
        ...message.aiMeta,
        model: c.model,
        tokensIn: c.tokensIn,
        tokensOut: c.tokensOut,
        generatedByAi: c.classifiedByAi,
      },
    })
  })

  log.info({ messageId: message.id, intent: c.intent, ai: c.classifiedByAi }, 'inquiry triaged')

  // Honor opt-outs: an 'unsubscribe' reply suppresses that address (compliance).
  if (c.intent === 'unsubscribe' && message.fromAddress) {
    const value = message.fromAddress.toLowerCase()
    await runInTenant(partial, async (ctx) => {
      const existing = await ctx.db.suppressionEntries.findFirst(
        and(eq(suppressionEntries.scope, 'email'), eq(suppressionEntries.value, value))!,
      )
      if (!existing) {
        await ctx.db.suppressionEntries.insert({ scope: 'email', value, reason: 'unsubscribe' } as never)
      }
    })
    log.info({ address: value }, 'unsubscribe reply — address suppressed')
  }
}

export const emailInboundReceived = inngest.createFunction(
  { id: 'email-inbound-received', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleEmailInboundReceived(event.data, runId)
  },
)
