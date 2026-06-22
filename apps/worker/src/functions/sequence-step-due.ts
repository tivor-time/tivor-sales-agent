import { parseEvent } from '@tradepilot/shared'
import { inngest } from '../client'
import { withTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'sequence/step.due' as const

/**
 * Pure, testable handler body. Validates the payload, builds a tenant-scoped
 * context, and (for now) checks the message is still queued and logs send
 * intent. The actual send — resolve a verified EmailIdentity + mailbox provider
 * and advance queued → sending → sent — lands in P3, where sending stays OFF
 * until domain auth (SPF/DKIM/DMARC) verifies (hard deliverability rule).
 */
export async function handleSequenceStepDue(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)
  await withTenant(
    { tenantId: data.tenantId, actorUserId: data.actorUserId, requestId },
    async (ctx) => {
      if (!data.messageId) {
        log.info('event has no messageId — nothing to send')
        return
      }
      const message = await ctx.db.messages.findById(data.messageId)
      if (!message || message.status !== 'queued') {
        log.info(
          { messageId: data.messageId, status: message?.status },
          'skip: message is not in the queued state',
        )
        return
      }
      // TODO(P3): send via the tenant's verified mailbox identity, then advance
      // the message status (queued → sending → sent) and record usage.
      log.info(
        { messageId: data.messageId },
        'message queued; send held until P3 mailbox + domain-auth lands',
      )
    },
  )
}

export const sequenceStepDue = inngest.createFunction(
  { id: 'sequence-step-due', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleSequenceStepDue(event.data, runId)
  },
)
