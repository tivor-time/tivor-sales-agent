/**
 * Gmail MailboxProvider adapter — raw fetch + node:crypto, no SDK. SERVER-ONLY
 * (reads env/flags). Reached only via getMailboxProvider in ../server.ts.
 */
import { randomUUID } from 'node:crypto'
import { env, flags } from '../../env'
import type { InboundMessage, MailboxProvider } from '../types'
import { buildMime } from './mime'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const HISTORY_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/history'
const LIST_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'
const PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile'
// gmail.send (outbound) + gmail.readonly (inbound polling) + identity.
const SCOPE =
  'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly openid email'

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

interface GmailHeader {
  name: string
  value: string
}
interface GmailPart {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPart[]
  headers?: GmailHeader[]
}

function findHeader(headers: GmailHeader[], name: string): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
}
/** "Display Name <addr@x.com>" -> "addr@x.com". */
function parseEmail(raw?: string): string {
  if (!raw) return ''
  const m = raw.match(/<([^>]+)>/)
  return (m ? m[1]! : raw).trim()
}
function decodeB64Url(data?: string): string {
  return data ? Buffer.from(data, 'base64url').toString('utf8') : ''
}
/** Walk a Gmail payload tree, collecting the first text/plain and text/html parts. */
function walkParts(payload: GmailPart | undefined): { text?: string; html?: string } {
  const out: { text?: string; html?: string } = {}
  const visit = (p?: GmailPart): void => {
    if (!p) return
    if (p.mimeType === 'text/plain' && p.body?.data && out.text === undefined) {
      out.text = decodeB64Url(p.body.data)
    } else if (p.mimeType === 'text/html' && p.body?.data && out.html === undefined) {
      out.html = decodeB64Url(p.body.data)
    }
    p.parts?.forEach(visit)
  }
  visit(payload)
  return out
}

async function getInboundMessage(accessToken: string, id: string): Promise<InboundMessage | null> {
  const res = await fetch(`${LIST_URL}/${id}?format=full`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const m = (await res.json()) as {
    id: string
    threadId?: string
    internalDate?: string
    payload?: GmailPart
  }
  const headers = m.payload?.headers ?? []
  const { text, html } = walkParts(m.payload)
  const refs = (findHeader(headers, 'References') ?? '').split(/\s+/).filter(Boolean)
  return {
    providerMessageId: m.id,
    internetMessageId: findHeader(headers, 'Message-Id') ?? findHeader(headers, 'Message-ID'),
    threadId: m.threadId,
    from: parseEmail(findHeader(headers, 'From')),
    to: (findHeader(headers, 'To') ?? '')
      .split(',')
      .map((s) => parseEmail(s))
      .filter(Boolean),
    subject: findHeader(headers, 'Subject') ?? '',
    text: text ?? '',
    html: html || undefined,
    receivedAt: m.internalDate ? new Date(Number(m.internalDate)) : new Date(),
    inReplyTo: findHeader(headers, 'In-Reply-To'),
    references: refs,
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

  async receive(input) {
    const max = input.maxMessages ?? 25
    const auth = { authorization: `Bearer ${input.accessToken}` }
    const prevHistoryId = input.providerState?.historyId as string | undefined
    let historyId = prevHistoryId
    let ids: string[] = []

    const hydrate = async (rawIds: string[]): Promise<InboundMessage[]> => {
      const unique = [...new Set(rawIds)].slice(0, max)
      const msgs = await Promise.all(unique.map((id) => getInboundMessage(input.accessToken, id)))
      return msgs.filter((m): m is InboundMessage => m !== null)
    }

    if (prevHistoryId) {
      const res = await fetch(
        `${HISTORY_URL}?startHistoryId=${prevHistoryId}&historyTypes=messageAdded&maxResults=${max}`,
        { headers: auth },
      )
      if (res.ok) {
        const j = (await res.json()) as {
          historyId?: string
          history?: { messagesAdded?: { message: { id: string } }[] }[]
        }
        historyId = j.historyId ? String(j.historyId) : prevHistoryId
        ids = (j.history ?? []).flatMap((h) => (h.messagesAdded ?? []).map((x) => x.message.id))
        return { messages: await hydrate(ids), providerState: { historyId } }
      }
      if (res.status !== 404) {
        // transient error — keep the cursor, fetch nothing this round
        return { messages: [], providerState: input.providerState }
      }
      // 404 -> stale cursor; fall through to reseed
    }

    // Cold start or reseed: list recent inbox, then seed the cursor from the profile.
    const listRes = await fetch(
      `${LIST_URL}?q=${encodeURIComponent('in:inbox newer_than:1d')}&maxResults=${max}`,
      { headers: auth },
    )
    if (listRes.ok) {
      const j = (await listRes.json()) as { messages?: { id: string }[] }
      ids = (j.messages ?? []).map((x) => x.id)
    }
    const profRes = await fetch(PROFILE_URL, { headers: auth })
    if (profRes.ok) historyId = String(((await profRes.json()) as { historyId?: string }).historyId)
    return { messages: await hydrate(ids), providerState: historyId ? { historyId } : {} }
  },
}
