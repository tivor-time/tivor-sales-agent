import { isDbConfigured, listReceivableIdentities } from '@tradepilot/db'
import { inngest } from '../client'
import { log } from '../lib/logger'

/**
 * Cron dispatcher: every few minutes, enumerate connected Gmail/Microsoft
 * identities across tenants and fan out one tenant-scoped poll event each. No
 * per-tenant DB work happens here (the cron has no tenant context).
 */
export const mailboxPoll = inngest.createFunction(
  { id: 'mailbox-poll', triggers: [{ cron: '*/3 * * * *' }] },
  async () => {
    if (!isDbConfigured()) return
    const identities = await listReceivableIdentities()
    if (identities.length === 0) return
    await Promise.all(
      identities.map((i) =>
        inngest.send({
          name: 'mailbox/poll.identity',
          data: { tenantId: i.tenantId, emailIdentityId: i.emailIdentityId },
        }),
      ),
    )
    log.info({ count: identities.length }, 'mailbox-poll dispatched')
  },
)
