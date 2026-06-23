import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { runInTenant, encrypt, schema } from '@tradepilot/db'
import { and, eq, isNull } from 'drizzle-orm'
import { env, flags } from '@tradepilot/shared/env'
import { getMailboxProvider } from '@tradepilot/shared/providers/server'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { newPkce, packState, unpackState, type OAuthProvider } from './oauth-state'

const { emailIdentities } = schema

function providerEnabled(provider: OAuthProvider): boolean {
  const providerKeyed = provider === 'gmail' ? flags.isGmailEnabled : flags.isMsGraphEnabled
  return providerKeyed && flags.isSecretStorageEnabled
}

function settingsRedirect(status: 'connected' | 'error'): NextResponse {
  return NextResponse.redirect(new URL(`/settings?mailbox=${status}`, env.APP_URL))
}

/** Begin the OAuth flow: mint PKCE + encrypted state, redirect to the provider. */
export async function startOAuth(provider: OAuthProvider): Promise<NextResponse> {
  if (!providerEnabled(provider)) {
    return new NextResponse(`${provider} OAuth is not configured.`, { status: 503 })
  }
  try {
    const partial = await resolveTenantContext()
    requireRole(partial, 'admin') // only admins may connect a mailbox
    const { verifier, challenge } = newPkce()
    const state = packState({
      tenantId: partial.tenantId,
      userId: partial.userId,
      provider,
      verifier,
    })
    return NextResponse.redirect(getMailboxProvider(provider).getAuthUrl(state, challenge))
  } catch {
    return settingsRedirect('error')
  }
}

/** OAuth callback: validate state, exchange the code (outside any tx), encrypt + store tokens. */
export async function oauthCallback(req: NextRequest, provider: OAuthProvider): Promise<NextResponse> {
  if (!providerEnabled(provider)) return new NextResponse('disabled', { status: 503 })

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  if (url.searchParams.get('error') || !code || !stateParam) return settingsRedirect('error')

  const st = unpackState(stateParam)
  if (!st || st.provider !== provider) return settingsRedirect('error')

  try {
    // Token exchange runs OUTSIDE any DB transaction (never hold a tx over network I/O).
    const tokens = await getMailboxProvider(provider).exchangeCode(code, st.verifier)
    if (!tokens.email) return settingsRedirect('error')

    const partial = await resolveTenantContext()
    if (partial.tenantId !== st.tenantId) return settingsRedirect('error') // session/state cross-check

    await runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      const existing = await ctx.db.emailIdentities.findFirst(
        and(eq(emailIdentities.email, tokens.email), isNull(emailIdentities.deletedAt))!,
      )
      const patch = {
        accessTokenEnc: encrypt(tokens.accessToken, ctx.tenantId),
        refreshTokenEnc: tokens.refreshToken ? encrypt(tokens.refreshToken, ctx.tenantId) : null,
        tokenExpiresAt: tokens.expiresAt ?? null,
        scopes: tokens.scopes,
      }
      if (existing) {
        await ctx.db.emailIdentities.update(existing.id, patch)
      } else {
        await ctx.db.emailIdentities.insert({ provider, email: tokens.email, ...patch } as never)
      }
    })

    return settingsRedirect('connected')
  } catch {
    return settingsRedirect('error')
  }
}
