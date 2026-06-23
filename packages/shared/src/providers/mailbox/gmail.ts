/**
 * Gmail MailboxProvider adapter — raw fetch + node:crypto, no SDK. SERVER-ONLY
 * (reads env/flags). Reached only via getMailboxProvider in ../server.ts.
 */
import { randomUUID } from 'node:crypto'
import { env, flags } from '../../env'
import type { MailboxProvider } from '../types'
import { buildMime } from './mime'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const SCOPE = 'https://www.googleapis.com/auth/gmail.send openid email'

function redirectUri(): string {
  return env.GMAIL_REDIRECT_URI ?? `${env.APP_URL}/api/oauth/gmail/callback`
}

/** Decode the `email` claim from an OIDC id_token (no signature check — informational only). */
function emailFromIdToken(idToken?: string): string | undefined {
  const part = idToken?.split('.')[1]
  if (!part) return undefined
  try {
    return (JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as { email?: string }).email
  } catch {
    return undefined
  }
}

export const gmailProvider: MailboxProvider = {
  id: 'gmail',
  isConfigured: flags.isGmailEnabled,

  getAuthUrl(state, codeChallenge) {
    const params = new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID ?? '',
      redirect_uri: redirectUri(),
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })
    return `${AUTH_URL}?${params.toString()}`
  },

  async exchangeCode(code, codeVerifier) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.GMAIL_CLIENT_ID ?? '',
        client_secret: env.GMAIL_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri(),
        code_verifier: codeVerifier,
      }),
    })
    if (!res.ok) throw new Error(`Gmail token exchange failed: ${res.status} ${await res.text()}`)
    const j = (await res.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
      id_token?: string
      scope?: string
    }
    let email = emailFromIdToken(j.id_token)
    if (!email) {
      const ui = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${j.access_token}` } })
      if (ui.ok) email = ((await ui.json()) as { email?: string }).email
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
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.GMAIL_CLIENT_ID ?? '',
        client_secret: env.GMAIL_CLIENT_SECRET ?? '',
      }),
    })
    if (!res.ok) throw new Error(`Gmail token refresh failed: ${res.status}`)
    const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number }
    return {
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresAt: new Date(Date.now() + j.expires_in * 1000),
    }
  },

  async send(input) {
    const domain = input.from.split('@')[1] ?? 'localhost'
    const mime = buildMime({
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      inReplyTo: input.inReplyTo,
      references: input.references,
      messageId: `<${randomUUID()}@${domain}>`,
    })
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${input.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ raw: Buffer.from(mime, 'utf8').toString('base64url') }),
    })
    if (!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`)
    const j = (await res.json()) as { id: string; threadId?: string }
    return { providerMessageId: j.id, threadId: j.threadId }
  },
}
