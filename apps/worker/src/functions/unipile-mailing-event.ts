import { parseEvent, type EventPayload } from '@tradepilot/shared'
import { runInTenant, schema } from '@tradepilot/db'
import { and, eq, sql } from 'drizzle-orm'
import { inngest } from '../client'
import { resolveWorkerTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'unipile/mailing.event' as const

const { messages, auditEvents } = schema

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function parseDate(v: unknown): Date {
  const text = asString(v)
  if (!text) return new Date()
  const d = new Date(text)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function attendeeAddress(v: unknown): string | null {
  if (!isRecord(v)) return null
  return asString(v.identifier) ?? asString(v.email) ?? null
}

function listAttendees(payload: Record<string, unknown>, key: string): string[] {
  const raw = payload[key]
  if (!Array.isArray(raw)) return []
  return raw.map(attendeeAddress).filter((x): x is string => !!x)
}

function firstAttendee(payload: Record<string, unknown>, key: string): string | null {
  return listAttendees(payload, key)[0] ?? null
}

function parseProviderMessageId(payload: Record<string, unknown>): string | null {
  const emailId = asString(payload.email_id) ?? asString(payload.emailId)
  const messageId = asString(payload.message_id) ?? asString(payload.internet_message_id)
  const providerRaw = payload.provider_id
  if (emailId) return emailId
  if (messageId) return messageId
  if (isRecord(providerRaw)) {
    return (
      asString(providerRaw.message_id) ??
      asString(providerRaw.uid) ??
      asString(providerRaw.id) ??
      null
    )
  }
  const providerText = asString(providerRaw)
  if (!providerText) return null
  try {
    const parsed = JSON.parse(providerText) as unknown
    if (isRecord(parsed)) {
      return asString(parsed.message_id) ?? asString(parsed.uid) ?? providerText
    }
  } catch {
    return providerText
  }
  return providerText
}

function parseInReplyTo(payload: Record<string, unknown>): string | null {
  const raw = payload.in_reply_to
  if (isRecord(raw)) return asString(raw.message_id) ?? asString(raw.id)
  return asString(raw)
}

function parseReferences(payload: Record<string, unknown>): string[] {
  const refs = payload.references
  if (Array.isArray(refs)) return refs.map(asString).filter((x): x is string => !!x)
  const inReply = parseInReplyTo(payload)
  return inReply ? [inReply] : []
}

function parseBodyText(payload: Record<string, unknown>): { text: string | null; html: string | null } {
  const plain = asString(payload.body_plain) ?? asString(payload.text)
  const html = asString(payload.body)
  return { text: plain ?? html, html }
}

function parseFolders(payload: Record<string, unknown>): string[] {
  const raw = payload.folders
  if (Array.isArray(raw)) return raw.map(asString).filter((x): x is string => !!x)
  const single = asString(raw)
  return single ? [single] : []
}

async function handleMailReceived(
  data: EventPayload<typeof EVENT>,
  requestId: string,
): Promise<void> {
  const partial = await resolveWorkerTenant({
    tenantId: data.tenantId,
    actorUserId: data.actorUserId,
    requestId,
  })
  if (!partial) return

  const payload = data.payload
  const providerMessageId = parseProviderMessageId(payload)
  if (!providerMessageId) return

  const { text, html } = parseBodyText(payload)
  const inserted = await runInTenant(partial, async (ctx) => {
    const existing = await ctx.db.messages.findFirst(
      and(eq(messages.direction, 'inbound'), eq(messages.providerMessageId, providerMessageId))!,
    )
    if (existing) return false
    await ctx.db.messages.insert({
      direction: 'inbound',
      status: 'received',
      emailIdentityId: data.emailIdentityId,
      fromAddress: attendeeAddress(payload.from_attendee),
      toAddress: firstAttendee(payload, 'to_attendees'),
      subject: asString(payload.subject),
      bodyText: text,
      bodyHtml: html,
      providerMessageId,
      threadId: asString(payload.thread_id) ?? asString(payload.conversation_id),
      inReplyTo: parseInReplyTo(payload),
      references: parseReferences(payload),
      receivedAt: parseDate(payload.date),
      aiMeta: {
        provider: 'unipile',
        unipileEvent: 'mail_received',
        unipileEmailId: asString(payload.email_id),
      },
    } as never)
    return true
  })

  if (inserted) {
    await inngest.send({
      name: 'email/inbound.received',
      data: {
        tenantId: data.tenantId,
        actorUserId: data.actorUserId,
        emailIdentityId: data.emailIdentityId,
        providerMessageId,
      },
    })
  }
}

async function handleMailSent(
  data: EventPayload<typeof EVENT>,
  requestId: string,
): Promise<void> {
  const partial = await resolveWorkerTenant({
    tenantId: data.tenantId,
    actorUserId: data.actorUserId,
    requestId,
  })
  if (!partial) return

  const payload = data.payload
  const providerMessageId = parseProviderMessageId(payload)
  if (!providerMessageId) return

  const { text, html } = parseBodyText(payload)
  await runInTenant(partial, async (ctx) => {
    const existing = await ctx.db.messages.findFirst(eq(messages.providerMessageId, providerMessageId))
    if (existing && existing.direction === 'outbound') {
      await ctx.db.messages.update(existing.id, {
        status: existing.status === 'queued' || existing.status === 'sending' ? 'sent' : existing.status,
        sentAt: existing.sentAt ?? parseDate(payload.date),
        threadId: existing.threadId ?? asString(payload.thread_id) ?? asString(payload.conversation_id),
        fromAddress: existing.fromAddress ?? attendeeAddress(payload.from_attendee),
        toAddress: existing.toAddress ?? firstAttendee(payload, 'to_attendees'),
        aiMeta: { ...existing.aiMeta, provider: 'unipile', unipileEvent: 'mail_sent', unipileSynced: true },
      })
      return
    }
    if (existing) return

    await ctx.db.messages.insert({
      direction: 'outbound',
      status: 'sent',
      emailIdentityId: data.emailIdentityId,
      fromAddress: attendeeAddress(payload.from_attendee),
      toAddress: firstAttendee(payload, 'to_attendees'),
      subject: asString(payload.subject),
      bodyText: text,
      bodyHtml: html,
      providerMessageId,
      threadId: asString(payload.thread_id) ?? asString(payload.conversation_id),
      inReplyTo: parseInReplyTo(payload),
      references: parseReferences(payload),
      sentAt: parseDate(payload.date),
      aiMeta: {
        provider: 'unipile',
        unipileEvent: 'mail_sent',
        unipileSynced: true,
      },
    } as never)
  })
}

async function handleMailMoved(
  data: EventPayload<typeof EVENT>,
  requestId: string,
): Promise<void> {
  const partial = await resolveWorkerTenant({
    tenantId: data.tenantId,
    actorUserId: data.actorUserId,
    requestId,
  })
  if (!partial) return

  const payload = data.payload
  const providerMessageId = parseProviderMessageId(payload)
  const occurredAt = parseDate(payload.date).toISOString()
  const folders = parseFolders(payload)
  const idempotencyKey =
    asString(payload.tracking_id) ??
    [data.accountId, providerMessageId ?? 'unknown', occurredAt, folders.join('|')].join(':')

  await runInTenant(partial, async (ctx) => {
    const existing = await ctx.db.auditEvents.findFirst(
      and(
        eq(auditEvents.entityType, 'unipile_mailing'),
        sql`${auditEvents.after} ->> 'idempotencyKey' = ${idempotencyKey}`,
      )!,
    )
    if (existing) return

    const related =
      providerMessageId ? await ctx.db.messages.findFirst(eq(messages.providerMessageId, providerMessageId)) : null

    await ctx.db.auditEvents.insert({
      actorType: 'system',
      source: 'worker',
      requestId,
      action: 'update',
      entityType: 'unipile_mailing',
      entityId: related?.id ?? null,
      after: {
        idempotencyKey,
        event: 'mail_moved',
        accountId: data.accountId,
        providerMessageId,
        subject: asString(payload.subject),
        fromAddress: attendeeAddress(payload.from_attendee),
        toAddress: firstAttendee(payload, 'to_attendees'),
        role: asString(payload.role),
        folders,
        occurredAt,
      },
    } as never)
  })
}

export async function handleUnipileMailingEvent(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)

  try {
    if (data.event === 'mail_received') await handleMailReceived(data, requestId)
    if (data.event === 'mail_sent') await handleMailSent(data, requestId)
    if (data.event === 'mail_moved') await handleMailMoved(data, requestId)
    log.info({ event: data.event, accountId: data.accountId }, 'unipile mailing processed')
  } catch (err) {
    log.error({ err, event: data.event, accountId: data.accountId }, 'unipile mailing failed')
    throw err
  }
}

export const unipileMailingEvent = inngest.createFunction(
  { id: 'unipile-mailing-event', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleUnipileMailingEvent(event.data, runId)
  },
)
