import { parseEvent } from '@tradepilot/shared'
import { inngest } from '../client'
import { eventLogger } from '../lib/logger'

export const EVENT = 'email/bounce.received' as const

/** Pure handler body. Full implementation (suppress address + mark bounced) is P4. */
export async function handleEmailBounceReceived(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  eventLogger(EVENT, data.tenantId, requestId).info(
    { address: data.address, messageId: data.messageId },
    'bounce received — handler lands in P4',
  )
}

export const emailBounceReceived = inngest.createFunction(
  { id: 'email-bounce-received', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleEmailBounceReceived(event.data, runId)
  },
)
