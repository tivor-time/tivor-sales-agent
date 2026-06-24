import { NextResponse, type NextRequest } from 'next/server'
import { findIdentityByUnipileAccountId } from '@tradepilot/db'
import { env, flags } from '@tradepilot/shared/env'
import { sendEvent } from '@/lib/inngest/client'
import { safeEqual } from '@/server/mailbox/webhook-auth'

type MailingEventName = 'mail_received' | 'mail_sent' | 'mail_moved'

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function normalizeEventName(raw: unknown): MailingEventName | null {
  const text = asString(raw)?.toLowerCase()
  if (!text) return null
  const normalized = text.replace(/\./g, '_')
  if (normalized === 'mail_received' || normalized === 'mail_sent' || normalized === 'mail_moved') {
    return normalized
  }
  return null
}

function normalizePayload(input: unknown): Array<{
  accountId: string
  event: MailingEventName
  payload: Record<string, unknown>
}> {
  const list: unknown[] = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input.items)
      ? input.items
      : [input]
  const out: Array<{ accountId: string; event: MailingEventName; payload: Record<string, unknown> }> = []
  for (const entry of list) {
    if (!isRecord(entry)) continue
    const accountId = asString(entry.account_id) ?? asString(entry.accountId)
    const event = normalizeEventName(entry.event)
    if (!accountId || !event) continue
    out.push({ accountId, event, payload: entry })
  }
  return out
}

function authorized(req: NextRequest): boolean {
  return safeEqual(req.headers.get('Unipile-Auth'), env.UNIPILE_WEBHOOK_SECRET)
}

export async function POST(req: NextRequest) {
  if (!flags.isUnipileEnabled) return new NextResponse('unipile not configured', { status: 503 })
  if (!authorized(req)) return new NextResponse('unauthorized', { status: 401 })

  const raw = (await req.json().catch(() => null)) as unknown
  const events = normalizePayload(raw)
  if (events.length === 0) return NextResponse.json({ ok: true, accepted: 0, ignored: 0 })

  let accepted = 0
  let ignored = 0
  await Promise.all(
    events.map(async (evt) => {
      const identity = await findIdentityByUnipileAccountId(evt.accountId)
      if (!identity) {
        ignored += 1
        return
      }
      await sendEvent('unipile/mailing.event', {
        tenantId: identity.tenantId,
        emailIdentityId: identity.emailIdentityId,
        accountId: evt.accountId,
        event: evt.event,
        payload: evt.payload,
      })
      accepted += 1
    }),
  )

  return NextResponse.json({ ok: true, accepted, ignored })
}

