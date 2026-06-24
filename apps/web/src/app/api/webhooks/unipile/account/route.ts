import { NextResponse, type NextRequest } from 'next/server'
import { findIdentityByUnipileAccountId } from '@tradepilot/db'
import { env, flags } from '@tradepilot/shared/env'
import { sendEvent } from '@/lib/inngest/client'
import { safeEqual } from '@/server/mailbox/webhook-auth'

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function normalizePayload(input: unknown): Array<{
  accountId: string
  status: string
  payload: Record<string, unknown>
}> {
  const list: unknown[] = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input.items)
      ? input.items
      : [input]
  const out: Array<{ accountId: string; status: string; payload: Record<string, unknown> }> = []

  for (const entry of list) {
    if (!isRecord(entry)) continue
    const accountStatus = isRecord(entry.AccountStatus) ? entry.AccountStatus : entry
    const accountId = asString(accountStatus.account_id) ?? asString(accountStatus.accountId)
    const status = asString(accountStatus.message) ?? asString(accountStatus.status)
    if (!accountId || !status) continue
    out.push({ accountId, status, payload: entry })
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
  const statuses = normalizePayload(raw)
  if (statuses.length === 0) return NextResponse.json({ ok: true, accepted: 0, ignored: 0 })

  let accepted = 0
  let ignored = 0
  await Promise.all(
    statuses.map(async (evt) => {
      const identity = await findIdentityByUnipileAccountId(evt.accountId)
      if (!identity) {
        ignored += 1
        return
      }
      await sendEvent('unipile/account.status', {
        tenantId: identity.tenantId,
        emailIdentityId: identity.emailIdentityId,
        accountId: evt.accountId,
        status: evt.status,
        payload: evt.payload,
      })
      accepted += 1
    }),
  )

  return NextResponse.json({ ok: true, accepted, ignored })
}

