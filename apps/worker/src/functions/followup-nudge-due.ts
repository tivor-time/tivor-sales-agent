import { parseEvent } from '@tradepilot/shared'
import { inngest } from '../client'
import { withTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'followup/nudge.due' as const

const CADENCE_DAYS: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }
const DAY_MS = 86_400_000

/**
 * A follow-up task is due. Recurring tasks reschedule forward (so they don't
 * re-fire); one-off tasks just stay due and are surfaced in the UI.
 */
export async function handleFollowupNudgeDue(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)
  await withTenant(
    { tenantId: data.tenantId, actorUserId: data.actorUserId, requestId },
    async (ctx) => {
      const task = await ctx.db.followUpTasks.findById(data.followUpTaskId)
      if (!task || task.deletedAt) return
      if (task.status !== 'open' && task.status !== 'in_progress') return
      if (task.cadence === 'once') {
        log.info({ followUpTaskId: task.id }, 'follow-up due (one-off) — surfaced in the UI')
        return
      }
      const days = CADENCE_DAYS[task.cadence] ?? 1
      const base = task.dueDate && task.dueDate.getTime() > Date.now() ? task.dueDate : new Date()
      const next = new Date(base.getTime() + days * DAY_MS)
      await ctx.db.followUpTasks.update(task.id, { dueDate: next })
      log.info({ followUpTaskId: task.id, cadence: task.cadence }, 'recurring follow-up rescheduled')
    },
  )
}

export const followupNudgeDue = inngest.createFunction(
  { id: 'followup-nudge-due', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleFollowupNudgeDue(event.data, runId)
  },
)
