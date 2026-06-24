import { NextResponse, type NextRequest } from 'next/server'
import { sql } from 'drizzle-orm'
import { createTenantContextFromWorker, runInTenant, schema } from '@tradepilot/db'
import { env, flags } from '@tradepilot/shared/env'
import { sendEvent } from '@/lib/inngest/client'
import { getAccountById } from '@/server/mailbox/unipile'
import { unpackUnipileState } from '@/server/mailbox/unipile-state'
import { safeEqual } from '@/server/mailbox/webhook-auth'

const { emailIdentities } = schema

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function isAuthorized(req: NextRequest): boolean {
  const secret = env.UNIPILE_WEBHOOK_SECRET
  if (!secret) return false
  const viaHeader = safeEqual(req.headers.get('Unipile-Auth'), secret)
  const viaQuery = safeEqual(new URL(req.url).searchParams.get('token'), secret)
  return viaHeader || viaQuery
}

/**
 * Unipile hosted-auth notify webhook. This is a STATUS-REFRESH endpoint only —
 * it never creates an EmailIdentity or writes credentials. Initial mailbox linking
 * is owned by the same-origin browser callback (api/oauth/unipile/callback), which
 * runs in an authenticated admin session.
 *
 * Hardening (review findings): the bound account is verified to exist under our own
 * Unipile API key (getAccountById must return non-null), and we only update a row
 * that is ALREADY linked to that exact account_id within the tenant from the signed
 * state. A forged/replayed notify therefore cannot bind an attacker's account into a
 * victim tenant, mint an identity, or overwrite tokens — at most it refreshes the
 * status metadata of a mailbox the tenant already owns.
 */
export async function POST(req: NextRequest) {
  if (!flags.isUnipileEnabled || !flags.isSecretStorageEnabled) {
    return new NextResponse('unipile not configured', { status: 503 })
  }
  if (!isAuthorized(req)) {
    return new NextResponse('unauthorized', { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as unknown
  if (!isRecord(body)) return new NextResponse('bad payload', { status: 400 })

  const accountId = asString(body.account_id)
  const status = asString(body.status) ?? 'CREATION_SUCCESS'
  const packedState = asString(body.name)
  if (!accountId || !packedState) return new NextResponse('missing account_id or name', { status: 400 })

  const state = unpackUnipileState(packedState)
  if (!state) return new NextResponse('invalid state', { status: 400 })

  try {
    // The account must exist under OUR Unipile API key. Rejects forged/unknown ids.
    const account = await getAccountById(accountId)
    if (!account) return new NextResponse('unknown account', { status: 400 })

    const partial = await createTenantContextFromWorker({
      tenantId: state.tenantId,
      actorUserId: state.userId,
      requestId: `unipile-notify-${Date.now()}`,
    })
    const nowIso = new Date().toISOString()

    // Update-only: only an identity already linked to this account_id is touched.
    const identityId = await runInTenant(partial, async (ctx) => {
      const row = await ctx.db.emailIdentities.findFirst(
        sql`${emailIdentities.providerState} ->> 'unipileAccountId' = ${accountId}`,
      )
      if (!row) return null
      await ctx.db.emailIdentities.update(row.id, {
        displayName: asString(account.name) ?? row.displayName ?? null,
        providerState: {
          ...(row.providerState ?? {}),
          unipileAccountId: accountId,
          unipileStatus: status,
          unipileStatusUpdatedAt: nowIso,
          unipileType: account.type ?? null,
          unipileSources: account.sources ?? [],
        },
      })
      return row.id
    })

    // Not yet linked (browser callback hasn't created it, or wrong tenant): ignore.
    if (!identityId) return NextResponse.json({ ok: true, ignored: true })

    await sendEvent('unipile/account.status', {
      tenantId: state.tenantId,
      actorUserId: state.userId,
      emailIdentityId: identityId,
      accountId,
      status,
      payload: body,
    })
  } catch {
    return new NextResponse('processing error', { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
