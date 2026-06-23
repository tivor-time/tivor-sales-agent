/**
 * Microsoft Graph MailboxProvider adapter — raw fetch + node:crypto, no SDK.
 * SERVER-ONLY. Reached only via getMailboxProvider in ../server.ts.
 *
 * Graph's /me/sendMail takes a JSON message object (no raw MIME) and returns 202
 * with an empty body and no id, so we self-assign a Message-ID for our own
 * tracking. NOTE: Graph restricts custom internet message headers, so threading
 * (In-Reply-To/References) + List-Unsubscribe are not yet set here — a follow-up
 * can switch to the MIME upload endpoint if strict threading is required.
 */
import { randomUUID } from 'node:crypto'
import { env, flags } from '../../env'
import type { MailboxProvider } from '../types'

const SCOPE =
  'openid email offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read'
const SEND_URL = 'https://graph.microsoft.com/v1.0/me/sendMail'
const ME_URL = 'https://graph.microsoft.com/v1.0/me'

function authority(): string {
  return `https://login.microsoftonline.com/${env.MS_GRAPH_TENANT_ID ?? 'common'}`
}
function redirectUri(): string {
  return env.MS_GRAPH_REDIRECT_URI ?? `${env.APP_URL}/api/oauth/microsoft/callback`
}
function claimFromIdToken(idToken: string | undefined, claim: string): string | undefined {
  const part = idToken?.split('.')[1]
  if (!part) return undefined
  try {
    return (JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, string>)[claim]
  } catch {
    return undefined
  }
}

export const msGraphProvider: MailboxProvider = {
  id: 'microsoft',
  isConfigured: flags.isMsGraphEnabled,

  getAuthUrl(state, codeChallenge) {
    const params = new URLSearchParams({
      client_id: env.MS_GRAPH_CLIENT_ID ?? '',
      response_type: 'code',
      redirect_uri: redirectUri(),
      response_mode: 'query',
      scope: SCOPE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })
    return `${authority()}/oauth2/v2.0/authorize?${params.toString()}`
  },

  async exchangeCode(code, codeVerifier) {
    const res = await fetch(`${authority()}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.MS_GRAPH_CLIENT_ID ?? '',
        client_secret: env.MS_GRAPH_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri(),
        code_verifier: codeVerifier,
        scope: SCOPE,
      }),
    })
    if (!res.ok) throw new Error(`Microsoft token exchange failed: ${res.status} ${await res.text()}`)
    const j = (await res.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
      id_token?: string
      scope?: string
    }
    let email = claimFromIdToken(j.id_token, 'email') ?? claimFromIdToken(j.id_token, 'preferred_username')
    if (!email) {
      const me = await fetch(ME_URL, { headers: { authorization: `Bearer ${j.access_token}` } })
      if (me.ok) {
        const m = (await me.json()) as { mail?: string; userPrincipalName?: string }
        email = m.mail ?? m.userPrincipalName
      }
    }
    return {
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresAt: new Date(Date.now() + j.expires_in * 1000),
      email: email ?? '',
      scopes: j.scope ? j.scope.split(' ') : [],
    }
  },

  async refresh(refreshToken) {
    const res = await fetch(`${authority()}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.MS_GRAPH_CLIENT_ID ?? '',
        client_secret: env.MS_GRAPH_CLIENT_SECRET ?? '',
        scope: SCOPE,
      }),
    })
    if (!res.ok) throw new Error(`Microsoft token refresh failed: ${res.status}`)
    const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number }
    return {
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresAt: new Date(Date.now() + j.expires_in * 1000),
    }
  },

  async send(input) {
    const domain = input.from.split('@')[1] ?? 'localhost'
    const providerMessageId = `<${randomUUID()}@${domain}>`
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${input.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: { contentType: input.html ? 'HTML' : 'Text', content: input.html ?? input.text },
          toRecipients: [{ emailAddress: { address: input.to } }],
        },
        saveToSentItems: true,
      }),
    })
    if (!res.ok) throw new Error(`Microsoft send failed: ${res.status} ${await res.text()}`)
    return { providerMessageId }
  },
}
