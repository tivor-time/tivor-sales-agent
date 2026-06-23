import { isDbConfigured, listDueRecurringFollowUps } from '@tradepilot/db'
import { inngest } from '../client'
import { log } from '../lib/logger'

/**
 * Hourly cron: find recurring follow-up tasks that are due across tenants and fan
 * out one tenant-scoped nudge each (which reschedules them forward).
 */
export const followupsSweep = inngest.createFunction(
  { id: 'followups-sweep', triggers: [{ cron: '0 * * * *' }] },
  async () => {
    if (!isDbConfigured()) return
    const due = await listDueRecurringFollowUps()
    if (due.length === 0) return
    await Promise.all(
      due.map((t) =>
        inngest.send({
          name: 'followup/nudge.due',
          data: { tenantId: t.tenantId, followUpTaskId: t.followUpTaskId },
        }),
      ),
    )
    log.info({ count: due.length }, 'followups-sweep dispatched')
  },
)
