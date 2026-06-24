import 'server-only'
import { env, flags } from '@tradepilot/shared/env'

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function normalizeDsn(raw: string): string {
  return raw.replace(/\/+$/, '')
}

function buildUrl(path: string): string {
  if (!env.UNIPILE_DSN) throw new Error('Unipile DSN is not configured.')
  const clean = normalizeDsn(env.UNIPILE_DSN)
  return `${clean}${path.startsWith('/') ? path : `/${path}`}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!flags.isUnipileEnabled || !env.UNIPILE_API_KEY) {
    throw new Error('Unipile is not configured.')
  }
  const res = await fetch(buildUrl(path), {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-KEY': env.UNIPILE_API_KEY,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Unipile API error: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as T
}

export interface UnipileAccount {
  id: string
  type?: string
  name?: string
  connection_params?: Record<string, unknown>
  sources?: Array<{ id?: string; status?: string }>
}

/** Unipile email provider codes the hosted wizard should offer (no LinkedIn/WhatsApp). */
const EMAIL_PROVIDERS = ['GOOGLE', 'OUTLOOK', 'MAIL'] as const

/**
 * Create a Unipile Hosted Auth wizard link. Single documented endpoint:
 *   POST {DSN}/api/v1/hosted/accounts/link
 * The wizard URL is returned in the `url` field. On success Unipile redirects the
 * browser to success_redirect_url (?account_id=...) — our /callback route links the
 * EmailIdentity there, so connecting works on plain localhost (no public URL needed).
 * notify_url is a server-to-server STATUS REFRESH only (it never creates identities);
 * it fires when APP_URL is publicly reachable.
 * docs: https://developer.unipile.com/docs/hosted-auth
 */
export async function createHostedAuthLink(input: {
  /** Returned verbatim to notify_url as `name` — we pack tenant/user state into it. */
  name: string
  notifyUrl: string
  successRedirectUrl: string
  failureRedirectUrl: string
  providers?: string[]
  expiresInMinutes?: number
}): Promise<string> {
  const expiresOn = new Date(
    Date.now() + (input.expiresInMinutes ?? 30) * 60_000,
  ).toISOString()

  const res = await requestJson<{ object?: string; url?: unknown; link?: unknown }>(
    '/api/v1/hosted/accounts/link',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'create',
        providers: input.providers ?? [...EMAIL_PROVIDERS],
        api_url: normalizeDsn(env.UNIPILE_DSN ?? ''),
        expiresOn,
        success_redirect_url: input.successRedirectUrl,
        failure_redirect_url: input.failureRedirectUrl,
        notify_url: input.notifyUrl,
        name: input.name,
      }),
    },
  )

  const url = asString(res.url) ?? asString(res.link)
  if (!url) throw new Error('Unipile hosted auth link response missing url.')
  return url
}

export async function getAccountById(accountId: string): Promise<UnipileAccount | null> {
  try {
    return await requestJson<UnipileAccount>(
      `/api/v1/accounts/${encodeURIComponent(accountId)}`,
      { method: 'GET' },
    )
  } catch (e) {
    if (String((e as Error).message ?? '').includes(' 404 ')) return null
    throw e
  }
}

export type MappedMailboxProvider = 'gmail' | 'microsoft' | 'smtp'

export function mapAccountTypeToProvider(type?: string): MappedMailboxProvider {
  const upper = (type ?? '').toUpperCase()
  if (upper.includes('GOOGLE')) return 'gmail'
  if (upper.includes('MICROSOFT') || upper.includes('OUTLOOK')) return 'microsoft'
  return 'smtp'
}

export function extractMailboxEmail(account: UnipileAccount | null): string | null {
  if (!account) return null
  const params = isRecord(account.connection_params) ? account.connection_params : null
  const mail = params && isRecord(params.mail) ? params.mail : null
  const calendar = params && isRecord(params.calendar) ? params.calendar : null
  const candidates = [
    asString(mail?.username),
    asString(mail?.imap_user),
    asString(mail?.smtp_user),
    asString(calendar?.username),
    asString(account.name),
  ].filter((x): x is string => !!x)
  const email = candidates.find((x) => x.includes('@'))
  return email ? email.toLowerCase() : null
}
