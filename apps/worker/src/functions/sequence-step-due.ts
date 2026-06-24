import { parseEvent } from '@tradepilot/shared'
import { flags, isSendingEnabled } from '@tradepilot/shared/env'
import { canSend } from '@tradepilot/shared/deliverability'
import { getMailboxProviderForIdentity } from '@tradepilot/shared/providers/server'
import { decrypt, encrypt, runInTenant, schema } from '@tradepilot/db'
import { and, eq, gt, isNull, inArray, or } from 'drizzle-orm'
import { inngest } from '../client'
import { resolveWorkerTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'sequence/step.due' as const

const { emailIdentities, suppressionEntries, usageRecords } = schema

const REFRESH_SKEW_MS = 60_000

/**
 * Send a queued outreach message. Structured to NEVER double-send and NEVER hold
 * a transaction across the network send:
 *   tx1  — load, run all gates, and claim queued->sending (commits before send)
 *   net  — decrypt token, refresh if expiring, provider.send()  (no tx open)
 *   tx2  — mark sent
 *   tx3  — idempotent bookkeeping (separate tx; cannot roll back the 'sent' write)
 * Because the claim commits before the send, an Inngest retry after any
 * post-send failure finds the message in 'sending' (not 'queued') and skips it.
 */
export async function handleSequenceStepDue(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)
  if (!data.messageId) {
    log.info('event has no messageId — nothing to send')
    return
  }
  const messageId = data.messageId

  const partial = await resolveWorkerTenant({
    tenantId: data.tenantId,
    actorUserId: data.actorUserId,
    requestId,
  })
  if (!partial) return // DB not configured — graceful no-op
  const tenantId = partial.tenantId

  // --- tx1: load + gate + CLAIM (queued -> sending). Commits BEFORE any send. ---
  const claim = await runInTenant(partial, async (ctx) => {
    const message = await ctx.db.messages.findById(messageId)
    if (!message || message.status !== 'queued') {
      log.info({ messageId, status: message?.status }, 'skip: message not queued')
      return null
    }
    if (!message.toAddress) {
      await ctx.db.messages.update(messageId, {
        status: 'failed',
        errorReason: 'No recipient address.',
      })
      return null
    }
    const identity = await ctx.db.emailIdentities.findFirst(
      and(eq(emailIdentities.sendingEnabled, true), isNull(emailIdentities.deletedAt))!,
    )
    if (!identity) {
      log.info('no verified sending identity — message held in queue')
      return null
    }
    if (!isSendingEnabled({ hasVerifiedDomainAuth: !!identity.domainVerifiedAt })) {
      log.info('static send gate is off — message held')
      return null
    }

    // Suppression (do-not-contact). Honor expiry: a lapsed temporary suppression
    // no longer blocks the recipient.
    const to = message.toAddress.toLowerCase()
    const domain = to.split('@')[1]
    const suppressed = await ctx.db.suppressionEntries.findMany({
      where: and(
        inArray(suppressionEntries.value, domain ? [to, domain] : [to]),
        or(isNull(suppressionEntries.expiresAt), gt(suppressionEntries.expiresAt, new Date())),
      ),
      limit: 5,
    })
    if (suppressed.length > 0) {
      await ctx.db.messages.update(messageId, { status: 'suppressed' })
      log.info({ to }, 'recipient is suppressed — not sending')
      return null
    }

    const gate = canSend({
      tenantSendingEnabled: true,
      identitySendingEnabled: identity.sendingEnabled,
      spf: identity.spfStatus,
      dkim: identity.dkimStatus,
      dmarc: identity.dmarcStatus,
      allowUnverifiedDomainAuth: flags.isDomainAuthBypassEnabled,
      warmupState: identity.warmupState,
      sentToday: identity.sentToday,
      dailyCap: identity.dailyCap,
    })
    if (!gate.allowed) {
      log.info({ reason: gate.reason }, 'canSend denied — message held')
      return null
    }
    if (flags.isDomainAuthBypassEnabled && !identity.domainVerifiedAt) {
      log.warn(
        { messageId, identityId: identity.id, to: message.toAddress },
        'SENDING UNDER DOMAIN-AUTH BYPASS — SPF/DKIM/DMARC not verified for this mailbox',
      )
    }

    // Claim. The DAL update is not status-conditional, but nothing in P3 produces
    // concurrent sends for one message, and committing this before the send (below)
    // removes the rollback/retry double-send hazard.
    await ctx.db.messages.update(messageId, {
      status: 'sending',
      emailIdentityId: identity.id,
      fromAddress: identity.email,
    })
    return {
      identity,
      send: {
        to: message.toAddress,
        subject: message.subject ?? '',
        text: message.bodyText ?? '',
        html: message.bodyHtml ?? undefined,
        inReplyTo: message.inReplyTo ?? undefined,
        references: message.references,
      },
    }
  })
  if (!claim) return

  const { identity, send } = claim
  const provider = getMailboxProviderForIdentity(identity)

  const markFailed = (reason: string) =>
    runInTenant(partial, async (ctx) => {
      await ctx.db.messages.update(messageId, { status: 'failed', errorReason: reason.slice(0, 500) })
    })

  // --- net: decrypt token + refresh-if-expiring, OUTSIDE any tx. ---
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
  } catch (tokenErr) {
    log.error({ err: tokenErr, messageId }, 'token decrypt/refresh failed')
    await markFailed('Mailbox token is invalid or expired; reconnect the mailbox.')
    return
  }

  // --- net: send, OUTSIDE any tx. ---
  let result: { providerMessageId: string; threadId?: string }
  try {
    result = await provider.send({ accessToken, from: identity.email, ...send })
  } catch (sendErr) {
    log.error({ err: sendErr, messageId }, 'send failed')
    await markFailed(String((sendErr as Error).message))
    return
  }

  // --- tx2: mark sent (its own tx; a failure here leaves the message 'sending',
  // which the retry guard skips — never a duplicate send). ---
  await runInTenant(partial, async (ctx) => {
    await ctx.db.messages.update(messageId, {
      status: 'sent',
      sentAt: new Date(),
      providerMessageId: result.providerMessageId,
      threadId: result.threadId ?? null,
    })
  })

  // --- tx3: idempotent post-send bookkeeping (separate tx; best-effort, can never
  // roll back the 'sent' write above). ---
  try {
    await runInTenant(partial, async (ctx) => {
      const key = `send:${messageId}`
      const existing = await ctx.db.usageRecords.findFirst(eq(usageRecords.idempotencyKey, key))
      if (!existing) {
        await ctx.db.usageRecords.insert({
          metric: 'email_sent',
          quantity: '1',
          idempotencyKey: key,
          meta: { messageId, provider: identity.provider },
        } as never)
      }
      // sentToday is a read-modify-write (the DAL has no atomic increment). Safe
      // here because nothing produces concurrent sends for a single identity;
      // warmup.tick resets it daily so any drift is bounded.
      await ctx.db.emailIdentities.update(identity.id, { sentToday: identity.sentToday + 1 })
    })
  } catch (bookErr) {
    log.warn({ err: bookErr, messageId }, 'post-send bookkeeping failed (message already sent)')
  }

  log.info({ messageId, providerMessageId: result.providerMessageId }, 'sent')
}

export const sequenceStepDue = inngest.createFunction(
  { id: 'sequence-step-due', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleSequenceStepDue(event.data, runId)
  },
)
