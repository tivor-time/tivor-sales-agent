import { parseEvent } from '@tradepilot/shared'
import { nextWarmup } from '@tradepilot/shared/deliverability'
import { inngest } from '../client'
import { withTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'mailbox/warmup.tick' as const

/**
 * Daily warmup tick for one mailbox: advance the warmup ramp (raising the daily
 * cap toward the target) and reset the per-day sent counter.
 */
export async function handleMailboxWarmupTick(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)
  await withTenant(
    { tenantId: data.tenantId, actorUserId: data.actorUserId, requestId },
    async (ctx) => {
      const identity = await ctx.db.emailIdentities.findById(data.emailIdentityId)
      if (!identity || identity.deletedAt) {
        log.info({ emailIdentityId: data.emailIdentityId }, 'identity not found — skipping warmup tick')
        return
      }
      const { warmupState, dailyCap } = nextWarmup(identity.warmupState, identity.dailyCap)
      await ctx.db.emailIdentities.update(identity.id, {
        warmupState,
        dailyCap,
        sentToday: 0,
        sentTodayResetAt: new Date(),
      })
      log.info({ emailIdentityId: identity.id, warmupState, dailyCap }, 'warmup tick applied')
    },
  )
}

export const mailboxWarmupTick = inngest.createFunction(
  { id: 'mailbox-warmup-tick', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleMailboxWarmupTick(event.data, runId)
  },
)
