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
import { noopMailbox } from './noop'

export type OAuthProvider = 'gmail' | 'microsoft'

/** The configured adapter for an OAuth provider, or a non-throwing noop when its keys are absent. */
export function getMailboxProvider(provider: OAuthProvider): MailboxProvider {
  if (provider === 'gmail') return flags.isGmailEnabled ? gmailProvider : noopMailbox
  if (provider === 'microsoft') return flags.isMsGraphEnabled ? msGraphProvider : noopMailbox
  return noopMailbox
}

export { noopMailbox } from './noop'
export { resolveDomainAuth, domainFromEmail } from './mailbox/dns'
export { buildMime, encodeHeaderWord } from './mailbox/mime'
export type { MailboxProvider } from './types'
