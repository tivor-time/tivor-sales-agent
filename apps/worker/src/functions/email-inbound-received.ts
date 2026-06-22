import { parseEvent } from '@tradepilot/shared'
import { inngest } from '../client'
import { eventLogger } from '../lib/logger'

export const EVENT = 'email/inbound.received' as const

/** Pure handler body. Full implementation (fetch + classify + persist) is P4. */
export async function handleEmailInboundReceived(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  eventLogger(EVENT, data.tenantId, requestId).info(
    { emailIdentityId: data.emailIdentityId, providerMessageId: data.providerMessageId },
    'inbound message received — handler lands in P4',
  )
}

export const emailInboundReceived = inngest.createFunction(
  { id: 'email-inbound-received', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleEmailInboundReceived(event.data, runId)
  },
)
