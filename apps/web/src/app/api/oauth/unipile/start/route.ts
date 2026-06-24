import { NextResponse } from 'next/server'
import { env, flags } from '@tradepilot/shared/env'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { createHostedAuthLink } from '@/server/mailbox/unipile'
import { packUnipileState } from '@/server/mailbox/unipile-state'

function settingsRedirect(status: 'connected' | 'error'): NextResponse {
  return NextResponse.redirect(new URL(`/settings?mailbox=${status}`, env.APP_URL))
}

export async function GET() {
  if (!flags.isUnipileEnabled || !flags.isSecretStorageEnabled) {
    return new NextResponse('unipile not configured', { status: 503 })
  }

  try {
    const partial = await resolveTenantContext()
    requireRole(partial, 'admin')

    const state = packUnipileState({ tenantId: partial.tenantId, userId: partial.userId })
    const notify = new URL('/api/webhooks/unipile/notify', env.APP_URL)
    notify.searchParams.set('token', env.UNIPILE_WEBHOOK_SECRET ?? '')

    // Unipile appends ?account_id=... to success_redirect_url, so point it at our
    // callback (browser-driven): it links the mailbox WITHOUT needing the notify
    // webhook to be publicly reachable — so connecting works on plain localhost.
    // notify_url still fires (for ongoing status/mail) when APP_URL is public.
    const success = new URL('/api/oauth/unipile/callback', env.APP_URL)
    success.searchParams.set('state', state)

    const hostedUrl = await createHostedAuthLink({
      name: state,
      notifyUrl: notify.toString(),
      successRedirectUrl: success.toString(),
      failureRedirectUrl: new URL('/settings?mailbox=error', env.APP_URL).toString(),
    })

    return NextResponse.redirect(hostedUrl)
  } catch (err) {
    console.error('[unipile start] failed', err)
    return settingsRedirect('error')
  }
}
