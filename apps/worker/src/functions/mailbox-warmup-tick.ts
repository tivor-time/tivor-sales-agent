import { parseEvent } from '@tradepilot/shared'
import { inngest } from '../client'
import { eventLogger } from '../lib/logger'

export const EVENT = 'mailbox/warmup.tick' as const

/** Pure handler body. Full implementation (ramp the daily send budget) is P3. */
export async function handleMailboxWarmupTick(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  eventLogger(EVENT, data.tenantId, requestId).info(
    { emailIdentityId: data.emailIdentityId },
    'warmup tick received — handler lands in P3',
  )
}

export const mailboxWarmupTick = inngest.createFunction(
  { id: 'mailbox-warmup-tick', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleMailboxWarmupTick(event.data, runId)
  },
)
