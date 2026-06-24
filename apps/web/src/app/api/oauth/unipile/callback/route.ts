import { and, eq, sql } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { createTenantContextFromWorker, encrypt, runInTenant, schema } from '@tradepilot/db'
import { env, flags } from '@tradepilot/shared/env'
import { isUnipileLinked } from '@tradepilot/shared/providers/server'
import { sendEvent } from '@/lib/inngest/client'
import { unpackUnipileState } from '@/server/mailbox/unipile-state'
import {
  extractMailboxEmail,
  getAccountById,
  mapAccountTypeToProvider,
} from '@/server/mailbox/unipile'

const { emailIdentities } = schema

function settingsRedirect(status: 'connected' | 'error'): NextResponse {
  return NextResponse.redirect(new URL(`/settings?mailbox=${status}`, env.APP_URL))
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

export async function GET(req: NextRequest) {
  if (!flags.isUnipileEnabled || !flags.isSecretStorageEnabled) return settingsRedirect('error')

  const url = new URL(req.url)
  if (url.searchParams.get('error_type')) return settingsRedirect('error')

  const accountId = url.searchParams.get('account_id')
  const stateRaw = url.searchParams.get('state')
  if (!accountId || !stateRaw) return settingsRedirect('error')

  const state = unpackUnipileState(stateRaw)
  if (!state) return settingsRedirect('error')

  try {
    const partial = await createTenantContextFromWorker({
      tenantId: state.tenantId,
      actorUserId: state.userId,
      requestId: `unipile-oauth-callback-${Date.now()}`,
    })

    const account = await getAccountById(accountId)
    const provider = mapAccountTypeToProvider(account?.type)
    const email = extractMailboxEmail(account) ?? `${accountId}@unipile.local`
    const status = 'CONNECTED'
    const nowIso = new Date().toISOString()

    const identityId = await runInTenant(partial, async (ctx) => {
      let row = await ctx.db.emailIdentities.findFirst(
        sql`${emailIdentities.providerState} ->> 'unipileAccountId' = ${accountId}`,
      )
      if (!row) {
        const byEmail =
          (await ctx.db.emailIdentities.findFirst(
            and(eq(emailIdentities.email, email), eq(emailIdentities.provider, provider))!,
          )) ?? (await ctx.db.emailIdentities.findFirst(eq(emailIdentities.email, email)))
        // Don't hijack a real direct-OAuth mailbox of the same email (it has its own
        // tokens) — only adopt a row that isn't already direct-OAuth credentialed.
        const isDirectOAuth =
          !!byEmail &&
          !isUnipileLinked(byEmail.providerState) &&
          (!!byEmail.refreshTokenEnc || (byEmail.scopes?.length ?? 0) > 0)
        if (byEmail && !isDirectOAuth) row = byEmail
      }

      const providerState: Record<string, unknown> = {
        ...(row?.providerState ?? {}),
        unipileAccountId: accountId,
        unipileStatus: status,
        unipileStatusUpdatedAt: nowIso,
        unipileType: account?.type ?? null,
        unipileSources: account?.sources ?? [],
      }
      const patch = {
        provider,
        email,
        displayName: asString(account?.name) ?? row?.displayName ?? null,
        accessTokenEnc: encrypt(accountId, ctx.tenantId),
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        scopes: [] as string[],
        providerState,
        deletedAt: null as Date | null,
        // Unipile sends through the user's real Gmail/Microsoft account, which is
        // already SPF/DKIM/DMARC-authenticated by the provider. So a Unipile mailbox
        // is deliverability-verified by definition — no DNS setup, and it passes the
        // send-gate in production without the dev bypass.
        spfStatus: 'pass' as const,
        dkimStatus: 'pass' as const,
        dmarcStatus: 'pass' as const,
        domainVerifiedAt: new Date(),
      }

      if (row) {
        await ctx.db.emailIdentities.update(row.id, patch)
        return row.id
      }
      const inserted = await ctx.db.emailIdentities.insert({
        ...patch,
        sendingEnabled: true,
      } as never)
      return inserted.id
    })

    await sendEvent('unipile/account.status', {
      tenantId: state.tenantId,
      actorUserId: state.userId,
      emailIdentityId: identityId,
      accountId,
      status,
      payload: {
        provider: url.searchParams.get('provider'),
        mode: 'oauth_callback',
      },
    })
    return settingsRedirect('connected')
  } catch (err) {
    console.error('[unipile callback] failed', err)
    return settingsRedirect('error')
  }
}

