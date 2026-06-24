/**
 * Unipile MailboxProvider adapter.
 *
 * Integration model:
 * - Hosted Auth is initiated by web routes (not by getAuthUrl/exchangeCode).
 * - The encrypted "accessToken" stored on EmailIdentity is the Unipile account_id.
 * - Inbound: receive() pulls from GET /api/v1/emails (cursor-paginated). This makes
 *   inbox sync work WITHOUT a public webhook — the poll worker drives it. The
 *   mail_received webhook still works when APP_URL is public; both dedupe on the
 *   same providerMessageId (the Unipile email id), so they're safe together.
 */
import { randomUUID } from 'node:crypto'
import { env, flags } from '../../env'
import type { MailboxProvider, InboundMessage } from '../types'

function apiUrl(path: string): string {
  const base = (env.UNIPILE_DSN ?? '').replace(/\/+$/, '')
  return `${base}${path}`
}

function apiKeyOrThrow(): string {
  if (!env.UNIPILE_API_KEY) throw new Error('Unipile API key is not configured.')
  return env.UNIPILE_API_KEY
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

interface UnipileSendResponse {
  id?: string
  provider_id?: string | { message_id?: string }
}

interface UnipileAttendee {
  identifier?: string
  display_name?: string
}

interface UnipileEmail {
  id?: string
  message_id?: string
  provider_id?: string | { message_id?: string }
  thread_id?: string
  subject?: string
  body?: string
  body_plain?: string
  date?: string
  role?: string
  folders?: string[]
  from_attendee?: UnipileAttendee
  to_attendees?: UnipileAttendee[]
  in_reply_to?: string | { message_id?: string }
  references?: string[]
}

interface UnipileEmailList {
  items?: UnipileEmail[]
  cursor?: string | null
}

// Inbox sync sizing. First sync backfills up to BACKFILL_MAX existing emails so the
// inbox isn't empty on connect; later polls just re-scan the newest page (the poll
// worker's idempotent insert dedupes what's already stored).
const UNIPILE_PAGE = 50
const UNIPILE_BACKFILL_MAX = 50
const UNIPILE_MAX_PAGES = 4

async function listUnipileEmails(
  accountId: string,
  limit: number,
  cursor?: string,
): Promise<UnipileEmailList> {
  const params = new URLSearchParams({ account_id: accountId, limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  const res = await fetch(apiUrl(`/api/v1/emails?${params.toString()}`), {
    method: 'GET',
    headers: { accept: 'application/json', 'X-API-KEY': apiKeyOrThrow() },
  })
  if (!res.ok) throw new Error(`Unipile list emails failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as UnipileEmailList
}

/** Only RECEIVED mail — never the mailbox's own Sent/Draft items. */
function isInboundEmail(e: UnipileEmail): boolean {
  if (str(e.role) === 'inbox') return true
  const folders = Array.isArray(e.folders) ? e.folders.map((f) => String(f).toUpperCase()) : []
  return folders.includes('INBOX') && !folders.includes('SENT') && !folders.includes('DRAFT')
}

function mapInboundEmail(e: UnipileEmail): InboundMessage | null {
  const providerMessageId =
    str(e.id) ??
    str(e.message_id) ??
    (typeof e.provider_id === 'string' ? str(e.provider_id) : str(e.provider_id?.message_id))
  if (!providerMessageId) return null
  const to = Array.isArray(e.to_attendees)
    ? e.to_attendees.map((a) => str(a?.identifier)).filter((x): x is string => !!x)
    : []
  const inReplyTo =
    typeof e.in_reply_to === 'string' ? str(e.in_reply_to) : str(e.in_reply_to?.message_id)
  const parsedDate = str(e.date) ? new Date(str(e.date) as string) : new Date()
  return {
    providerMessageId,
    internetMessageId: str(e.message_id) ?? undefined,
    threadId: str(e.thread_id) ?? undefined,
    from: str(e.from_attendee?.identifier) ?? '',
    to,
    subject: str(e.subject) ?? '',
    text: str(e.body_plain) ?? str(e.body) ?? '',
    html: str(e.body) ?? undefined,
    receivedAt: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    inReplyTo: inReplyTo ?? undefined,
    references: Array.isArray(e.references)
      ? e.references.filter((x): x is string => typeof x === 'string')
      : [],
  }
}

export const unipileProvider: MailboxProvider = {
  id: 'unipile',
  isConfigured: flags.isUnipileEnabled,

  getAuthUrl() {
    return ''
  },

  async exchangeCode() {
    throw new Error('Unipile Hosted Auth flow does not use OAuth code exchange.')
  },

  async send(input) {
    const accountId = input.accessToken
    if (!accountId) throw new Error('Missing Unipile account id.')
    if (!env.UNIPILE_API_KEY) throw new Error('Unipile API key is not configured.')

    const res = await fetch(apiUrl('/api/v1/emails'), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-KEY': env.UNIPILE_API_KEY,
      },
      body: JSON.stringify({
        account_id: accountId,
        from: { identifier: input.from },
        to: [{ identifier: input.to }],
        subject: input.subject,
        body: input.html ?? input.text,
      }),
    })

    if (!res.ok) throw new Error(`Unipile send failed: ${res.status} ${await res.text()}`)
    const j = (await res.json()) as UnipileSendResponse
    const providerMessageId =
      j.id ||
      (typeof j.provider_id === 'string'
        ? j.provider_id
        : (j.provider_id?.message_id ?? undefined)) ||
      `unipile-${randomUUID()}`
    return { providerMessageId }
  },

  async receive(input) {
    const accountId = input.accessToken
    if (!accountId) throw new Error('Missing Unipile account id.')
    apiKeyOrThrow()

    const state = { ...(input.providerState ?? {}) }
    const firstSync = state.unipileBackfillDone !== true
    const target = firstSync ? UNIPILE_BACKFILL_MAX : Math.max(input.maxMessages ?? 25, UNIPILE_PAGE)

    const messages: InboundMessage[] = []
    const seen = new Set<string>()
    let cursor: string | undefined
    for (let page = 0; page < UNIPILE_MAX_PAGES && messages.length < target; page++) {
      const pageSize = Math.min(UNIPILE_PAGE, target - messages.length)
      const result = await listUnipileEmails(accountId, pageSize, cursor)
      const items = result.items ?? []
      for (const e of items) {
        if (!isInboundEmail(e)) continue
        const m = mapInboundEmail(e)
        if (m && !seen.has(m.providerMessageId)) {
          seen.add(m.providerMessageId)
          messages.push(m)
        }
      }
      const next = str(result.cursor)
      if (!next || items.length === 0) break
      cursor = next
    }

    return {
      messages,
      providerState: { ...state, unipileBackfillDone: true, unipileLastSyncAt: new Date().toISOString() },
    }
  },
}

