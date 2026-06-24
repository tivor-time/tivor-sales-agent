/**
 * SERVER-ONLY barrel for the mailbox stack (node:dns / node:crypto / fetch).
 *
 * Never import this from a client component or from the @tradepilot/shared root
 * barrel — it would pull node-only modules into a client bundle. The web OAuth
 * routes + server actions and the worker import from here.
 */
import { flags } from '../env'
import type { MailboxProvider } from './types'
import { gmailProvider } from './mailbox/gmail'
import { msGraphProvider } from './mailbox/msgraph'
import { unipileProvider } from './mailbox/unipile'
import { noopMailbox } from './noop'

export type OAuthProvider = 'gmail' | 'microsoft'

/** The configured adapter for an OAuth provider, or a non-throwing noop when its keys are absent. */
export function getMailboxProvider(provider: OAuthProvider): MailboxProvider {
  if (provider === 'gmail') return flags.isGmailEnabled ? gmailProvider : noopMailbox
  if (provider === 'microsoft') return flags.isMsGraphEnabled ? msGraphProvider : noopMailbox
  return noopMailbox
}

/** Whether an identity is linked through Unipile (providerState holds its account id). */
export function isUnipileLinked(providerState: Record<string, unknown> | null | undefined): boolean {
  return typeof providerState?.unipileAccountId === 'string' && providerState.unipileAccountId.length > 0
}

/**
 * Resolve the effective mailbox adapter for a stored identity. Unipile-linked
 * identities route through the Unipile adapter regardless of provider enum.
 */
export function getMailboxProviderForIdentity(identity: {
  provider: string
  providerState?: Record<string, unknown> | null
}): MailboxProvider {
  if (flags.isUnipileEnabled && isUnipileLinked(identity.providerState)) return unipileProvider
  if (identity.provider === 'gmail') return flags.isGmailEnabled ? gmailProvider : noopMailbox
  if (identity.provider === 'microsoft') return flags.isMsGraphEnabled ? msGraphProvider : noopMailbox
  return noopMailbox
}

export { noopMailbox } from './noop'
export { resolveDomainAuth, domainFromEmail } from './mailbox/dns'
export { buildMime, encodeHeaderWord } from './mailbox/mime'
export type { MailboxProvider } from './types'
