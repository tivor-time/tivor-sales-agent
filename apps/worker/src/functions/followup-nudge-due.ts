import { parseEvent } from '@tradepilot/shared'
import { inngest } from '../client'
import { eventLogger } from '../lib/logger'

export const EVENT = 'followup/nudge.due' as const

/** Pure handler body. Full implementation (generate + enqueue a reminder) is P5. */
export async function handleFollowupNudgeDue(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  eventLogger(EVENT, data.tenantId, requestId).info(
    { followUpTaskId: data.followUpTaskId },
    'follow-up nudge received — handler lands in P5',
  )
}

export const followupNudgeDue = inngest.createFunction(
  { id: 'followup-nudge-due', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleFollowupNudgeDue(event.data, runId)
  },
)
