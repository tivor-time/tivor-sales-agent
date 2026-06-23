/**
 * Microsoft Graph MailboxProvider adapter — raw fetch + node:crypto, no SDK.
 * SERVER-ONLY. Reached only via getMailboxProvider in ../server.ts.
 *
 * Graph's /me/sendMail takes a JSON message object (no raw MIME) and returns 202
 * with an empty body and no id, so we self-assign a Message-ID for our own
 * tracking. Threading headers are not set on send (Graph restricts custom
 * internet headers); a follow-up can switch to the MIME upload endpoint.
 */
import { randomUUID } from 'node:crypto'
import { env, flags } from '../../env'
import type { InboundMessage, MailboxProvider } from '../types'

const SCOPE =
  'openid email offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read'
const SEND_URL = 'https://graph.microsoft.com/v1.0/me/sendMail'
const ME_URL = 'https://graph.microsoft.com/v1.0/me'
const INBOX_DELTA_URL = 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta'
const DELTA_SELECT =
  '$select=id,internetMessageId,conversationId,subject,from,toRecipients,body,bodyPreview,receivedDateTime,internetMessageHeaders'

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

interface GraphMessage {
  id: string
  internetMessageId?: string
  conversationId?: string
  subject?: string
  from?: { emailAddress?: { address?: string } }
  toRecipients?: { emailAddress?: { address?: string } }[]
  body?: { contentType?: string; content?: string }
  bodyPreview?: string
  receivedDateTime?: string
  internetMessageHeaders?: { name?: string; value?: string }[]
  '@removed'?: unknown
}

function mapGraphMessage(m: GraphMessage): InboundMessage {
  const headers = m.internetMessageHeaders ?? []
  const h = (name: string): string | undefined =>
    headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())?.value
  const isHtml = m.body?.contentType?.toLowerCase() === 'html'
  return {
    providerMessageId: m.id,
    internetMessageId: m.internetMessageId,
    threadId: m.conversationId,
    from: m.from?.emailAddress?.address ?? '',
    to: (m.toRecipients ?? []).map((r) => r.emailAddress?.address ?? '').filter(Boolean),
    subject: m.subject ?? '',
    text: isHtml ? (m.bodyPreview ?? '') : (m.body?.content ?? m.bodyPreview ?? ''),
    html: isHtml ? m.body?.content : undefined,
    receivedAt: m.receivedDateTime ? new Date(m.receivedDateTime) : new Date(),
    inReplyTo: h('In-Reply-To'),
    references: (h('References') ?? '').split(/\s+/).filter(Boolean),
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

  async receive(input) {
    const max = input.maxMessages ?? 25
    const auth = { authorization: `Bearer ${input.accessToken}`, Prefer: 'odata.maxpagesize=25' }
    const deltaLink = input.providerState?.deltaLink as string | undefined
    let url = deltaLink ?? `${INBOX_DELTA_URL}?${DELTA_SELECT}`
    const messages: InboundMessage[] = []
    let newDelta = deltaLink
    let pages = 0

    while (url && messages.length < max) {
      if (++pages > 12) break
      const res = await fetch(url, { headers: auth })
      if (!res.ok) {
        if (res.status === 410) {
          // stale delta token -> restart from base
          url = `${INBOX_DELTA_URL}?${DELTA_SELECT}`
          newDelta = undefined
          continue
        }
        return { messages: [], providerState: input.providerState }
      }
      const j = (await res.json()) as {
        value?: GraphMessage[]
        '@odata.nextLink'?: string
        '@odata.deltaLink'?: string
      }
      for (const m of j.value ?? []) {
        if (m['@removed']) continue
        messages.push(mapGraphMessage(m))
      }
      if (j['@odata.deltaLink']) {
        newDelta = j['@odata.deltaLink']
        break
      }
      url = j['@odata.nextLink'] ?? ''
    }

    return {
      messages: messages.slice(0, max),
      providerState: newDelta ? { deltaLink: newDelta } : {},
    }
  },
}
