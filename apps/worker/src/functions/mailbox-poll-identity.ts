import { parseEvent } from '@tradepilot/shared'
import { getMailboxProviderForIdentity } from '@tradepilot/shared/providers/server'
import { decrypt, encrypt, runInTenant, schema } from '@tradepilot/db'
import { and, eq } from 'drizzle-orm'
import { inngest } from '../client'
import { resolveWorkerTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'mailbox/poll.identity' as const

const { messages } = schema
const REFRESH_SKEW_MS = 60_000

/**
 * Fetch new inbound mail for one identity, persist each new message idempotently,
 * advance the incremental cursor, and emit email/inbound.received per new message
 * (persist-then-emit, so a classify failure never loses a stored message).
 */
export async function handleMailboxPollIdentity(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)
  const partial = await resolveWorkerTenant({
    tenantId: data.tenantId,
    actorUserId: data.actorUserId,
    requestId,
  })
  if (!partial) return
  const tenantId = partial.tenantId

  const identity = await runInTenant(partial, (ctx) =>
    ctx.db.emailIdentities.findById(data.emailIdentityId),
  )
  if (!identity || identity.deletedAt) {
    log.info({ emailIdentityId: data.emailIdentityId }, 'identity gone — skipping poll')
    return
  }
  const provider = getMailboxProviderForIdentity(identity)
  if (!provider.receive) return // unconfigured / no inbound support

  // Token decrypt + refresh OUTSIDE any tx.
  let accessToken: string
  try {
    accessToken = identity.accessTokenEnc ? decrypt(identity.accessTokenEnc, tenantId) : ''
    const expiringSoon =
      !!identity.tokenExpiresAt && identity.tokenExpiresAt.getTime() - Date.now() < REFRESH_SKEW_MS
    if (expiringSoon && identity.refreshTokenEnc && provider.refresh) {
      const fresh = await provider.refresh(decrypt(identity.refreshTokenEnc, tenantId))
      accessToken = fresh.accessToken
      await runInTenant(partial, async (ctx) => {
        await ctx.db.emailIdentities.update(identity.id, {
          accessTokenEnc: encrypt(fresh.accessToken, tenantId),
          refreshTokenEnc: fresh.refreshToken
            ? encrypt(fresh.refreshToken, tenantId)
            : identity.refreshTokenEnc,
          tokenExpiresAt: fresh.expiresAt ?? null,
        })
      })
    }
  } catch (e) {
    log.warn({ err: e }, 'token decrypt/refresh failed — skipping poll')
    return
  }

  // Fetch inbound (OUTSIDE any tx).
  let result
  try {
    result = await provider.receive({
      accessToken,
      providerState: identity.providerState ?? {},
      maxMessages: 25,
    })
  } catch (e) {
    log.warn({ err: e }, 'mailbox receive failed (re-consent / transient) — skipping')
    return
  }

  // Persist each new message in its OWN tx (a dup-insert can't poison the batch).
  const newIds: string[] = []
  for (const m of result.messages) {
    try {
      const inserted = await runInTenant(partial, async (ctx) => {
        const existing = await ctx.db.messages.findFirst(
          and(eq(messages.providerMessageId, m.providerMessageId), eq(messages.direction, 'inbound'))!,
        )
        if (existing) return false
        await ctx.db.messages.insert({
          direction: 'inbound',
          status: 'received',
          fromAddress: m.from,
          toAddress: m.to[0] ?? null,
          subject: m.subject,
          bodyText: m.text,
          bodyHtml: m.html ?? null,
          providerMessageId: m.providerMessageId,
          threadId: m.threadId ?? null,
          inReplyTo: m.inReplyTo ?? null,
          references: m.references,
          receivedAt: m.receivedAt,
          emailIdentityId: identity.id,
        } as never)
        return true
      })
      if (inserted) newIds.push(m.providerMessageId)
    } catch (e) {
      // Unique (tenant, providerMessageId) race -> already ingested; ignore.
      log.warn({ err: e, providerMessageId: m.providerMessageId }, 'inbound insert skipped')
    }
  }

  // Advance the incremental cursor (its own tx), regardless of per-message results.
  await runInTenant(partial, async (ctx) => {
    await ctx.db.emailIdentities.update(identity.id, { providerState: result.providerState })
  })

  // Emit one classify event per NEW message, after commit.
  for (const providerMessageId of newIds) {
    await inngest.send({
      name: 'email/inbound.received',
      data: { tenantId, emailIdentityId: identity.id, providerMessageId },
    })
  }
  if (newIds.length) log.info({ count: newIds.length }, 'inbound messages ingested')
}

export const mailboxPollIdentity = inngest.createFunction(
  { id: 'mailbox-poll-identity', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleMailboxPollIdentity(event.data, runId)
  },
)
