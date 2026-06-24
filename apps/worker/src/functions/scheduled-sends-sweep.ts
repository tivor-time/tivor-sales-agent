import { isDbConfigured, listDueScheduledSends } from '@tradepilot/db'
import { inngest } from '../client'
import { log } from '../lib/logger'

/**
 * Cron sweep for Autopilot follow-ups. Every few minutes, find outbound messages
 * whose scheduled send time has arrived (status 'scheduled', scheduledAt <= now)
 * and emit one sequence/step.due per message. The send handler claims 'scheduled'
 * the same way it claims 'queued', so the existing gates + no-double-send guard
 * apply unchanged. No tenant context here (the cron fans out tenant-scoped events).
 */
export const scheduledSendsSweep = inngest.createFunction(
  { id: 'scheduled-sends-sweep', triggers: [{ cron: '*/5 * * * *' }] },
  async () => {
    if (!isDbConfigured()) return
    const due = await listDueScheduledSends(new Date())
    if (due.length === 0) return
    await Promise.all(
      due.map((m) =>
        inngest.send({
          name: 'sequence/step.due',
          data: {
            tenantId: m.tenantId,
            messageId: m.messageId,
            sequenceStepId: m.sequenceStepId ?? undefined,
            leadId: m.leadId ?? undefined,
            contactId: m.contactId ?? undefined,
          },
        }),
      ),
    )
    log.info({ count: due.length }, 'scheduled-sends dispatched')
  },
)
