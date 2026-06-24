import { parseEvent } from '@tradepilot/shared'
import { runInTenant } from '@tradepilot/db'
import { inngest } from '../client'
import { resolveWorkerTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'unipile/account.status' as const

const DISABLE_SENDING = new Set(['CREDENTIALS', 'ERROR', 'STOPPED', 'DELETED'])

export async function handleUnipileAccountStatus(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)

  const partial = await resolveWorkerTenant({
    tenantId: data.tenantId,
    actorUserId: data.actorUserId,
    requestId,
  })
  if (!partial) return

  const status = data.status.toUpperCase()

  await runInTenant(partial, async (ctx) => {
    const identity = await ctx.db.emailIdentities.findById(data.emailIdentityId)
    if (!identity) return

    await ctx.db.emailIdentities.update(identity.id, {
      providerState: {
        ...identity.providerState,
        unipileAccountId: data.accountId,
        unipileStatus: status,
        unipileStatusUpdatedAt: new Date().toISOString(),
        unipileLastPayload: data.payload,
      },
      sendingEnabled: DISABLE_SENDING.has(status) ? false : identity.sendingEnabled,
    })

    await ctx.db.auditEvents.insert({
      actorType: 'system',
      source: 'worker',
      requestId,
      action: 'update',
      entityType: 'unipile_account',
      entityId: identity.id,
      after: {
        accountId: data.accountId,
        status,
      },
    } as never)
  })

  log.info({ accountId: data.accountId, status }, 'unipile account status processed')
}

export const unipileAccountStatus = inngest.createFunction(
  { id: 'unipile-account-status', retries: 2, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleUnipileAccountStatus(event.data, runId)
  },
)
