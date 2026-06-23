import { parseEvent } from '@tradepilot/shared'
import { schema } from '@tradepilot/db'
import { and, eq } from 'drizzle-orm'
import { inngest } from '../client'
import { withTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'email/bounce.received' as const

const { suppressionEntries } = schema

/** Suppress a hard-bouncing address and mark the referenced message bounced. */
export async function handleEmailBounceReceived(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)
  await withTenant(
    { tenantId: data.tenantId, actorUserId: data.actorUserId, requestId },
    async (ctx) => {
      const value = data.address.toLowerCase()
      const existing = await ctx.db.suppressionEntries.findFirst(
        and(eq(suppressionEntries.scope, 'email'), eq(suppressionEntries.value, value))!,
      )
      if (!existing) {
        await ctx.db.suppressionEntries.insert({ scope: 'email', value, reason: 'hard_bounce' } as never)
      }
      if (data.messageId) {
        await ctx.db.messages.update(data.messageId, { status: 'bounced' })
      }
      log.info({ address: value, messageId: data.messageId }, 'bounce processed — address suppressed')
    },
  )
}

export const emailBounceReceived = inngest.createFunction(
  { id: 'email-bounce-received', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleEmailBounceReceived(event.data, runId)
  },
)
