import { parseEvent } from '@tradepilot/shared'
import { isSendingEnabled } from '@tradepilot/shared/env'
import { canSend } from '@tradepilot/shared/deliverability'
import { getMailboxProvider } from '@tradepilot/shared/providers/server'
import { decrypt, encrypt, schema } from '@tradepilot/db'
import { and, eq, isNull, inArray } from 'drizzle-orm'
import { inngest } from '../client'
import { withTenant } from '../lib/tenant'
import { eventLogger } from '../lib/logger'

export const EVENT = 'sequence/step.due' as const

const { emailIdentities, suppressionEntries } = schema

const REFRESH_SKEW_MS = 60_000

/**
 * Send a queued outreach message. Enforces the hard send gate at every layer:
 * a verified, sending-enabled EmailIdentity must exist; the static
 * isSendingEnabled() process gate must pass; the recipient must not be
 * suppressed; and canSend() (SPF/DKIM/DMARC + warmup + daily cap) must allow it.
 * Tokens are decrypted only here, refreshed if near expiry, and never logged.
 */
export async function handleSequenceStepDue(rawData: unknown, requestId: string): Promise<void> {
  const data = parseEvent(EVENT, rawData)
  const log = eventLogger(EVENT, data.tenantId, requestId)

  await withTenant(
    { tenantId: data.tenantId, actorUserId: data.actorUserId, requestId },
    async (ctx) => {
      if (!data.messageId) {
        log.info('event has no messageId — nothing to send')
        return
      }
      const message = await ctx.db.messages.findById(data.messageId)
      if (!message || message.status !== 'queued') {
        log.info({ messageId: data.messageId, status: message?.status }, 'skip: message not queued')
        return
      }
      if (!message.toAddress) {
        await ctx.db.messages.update(message.id, { status: 'failed', errorReason: 'No recipient address.' })
        return
      }

      // A verified, sending-enabled mailbox identity must exist.
      const identity = await ctx.db.emailIdentities.findFirst(
        and(eq(emailIdentities.sendingEnabled, true), isNull(emailIdentities.deletedAt))!,
      )
      if (!identity) {
        log.info('no verified sending identity — message held in queue')
        return
      }

      // Static process gate (mailbox provider + secret storage + verified domain auth).
      if (!isSendingEnabled({ hasVerifiedDomainAuth: !!identity.domainVerifiedAt })) {
        log.info('static send gate is off — message held')
        return
      }

      // Suppression list (do-not-contact) check.
      const to = message.toAddress.toLowerCase()
      const domain = to.split('@')[1]
      const suppressed = await ctx.db.suppressionEntries.findMany({
        where: inArray(suppressionEntries.value, domain ? [to, domain] : [to]),
        limit: 5,
      })
      if (suppressed.length > 0) {
        await ctx.db.messages.update(message.id, { status: 'suppressed' })
        log.info({ to }, 'recipient is suppressed — not sending')
        return
      }

      // Per-identity send-eligibility gate.
      const gate = canSend({
        tenantSendingEnabled: true,
        identitySendingEnabled: identity.sendingEnabled,
        spf: identity.spfStatus,
        dkim: identity.dkimStatus,
        dmarc: identity.dmarcStatus,
        warmupState: identity.warmupState,
        sentToday: identity.sentToday,
        dailyCap: identity.dailyCap,
      })
      if (!gate.allowed) {
        log.info({ reason: gate.reason }, 'canSend denied — message held')
        return
      }

      // Claim the message (queued -> sending) so a retry can't double-send.
      await ctx.db.messages.update(message.id, {
        status: 'sending',
        emailIdentityId: identity.id,
        fromAddress: identity.email,
      })

      const provider = getMailboxProvider(identity.provider as 'gmail' | 'microsoft')
      let accessToken = identity.accessTokenEnc ? decrypt(identity.accessTokenEnc, ctx.tenantId) : ''

      // Refresh the access token if it is missing or about to expire.
      const expiringSoon =
        !!identity.tokenExpiresAt && identity.tokenExpiresAt.getTime() - Date.now() < REFRESH_SKEW_MS
      if (expiringSoon && identity.refreshTokenEnc && provider.refresh) {
        const fresh = await provider.refresh(decrypt(identity.refreshTokenEnc, ctx.tenantId))
        accessToken = fresh.accessToken
        await ctx.db.emailIdentities.update(identity.id, {
          accessTokenEnc: encrypt(fresh.accessToken, ctx.tenantId),
          refreshTokenEnc: fresh.refreshToken
            ? encrypt(fresh.refreshToken, ctx.tenantId)
            : identity.refreshTokenEnc,
          tokenExpiresAt: fresh.expiresAt ?? null,
        })
      }

      try {
        const result = await provider.send({
          accessToken,
          from: identity.email,
          to: message.toAddress,
          subject: message.subject ?? '',
          text: message.bodyText ?? '',
          html: message.bodyHtml ?? undefined,
          inReplyTo: message.inReplyTo ?? undefined,
          references: message.references,
        })
        await ctx.db.messages.update(message.id, {
          status: 'sent',
          sentAt: new Date(),
          providerMessageId: result.providerMessageId,
          threadId: result.threadId ?? null,
        })
        // Post-send bookkeeping is best-effort — never flip a sent message back to failed.
        try {
          await ctx.db.emailIdentities.update(identity.id, { sentToday: identity.sentToday + 1 })
          await ctx.db.usageRecords.insert({
            metric: 'email_sent',
            quantity: '1',
            idempotencyKey: `send:${message.id}`,
            meta: { messageId: message.id, provider: identity.provider },
          } as never)
        } catch (bookkeepErr) {
          log.warn({ err: bookkeepErr, messageId: message.id }, 'post-send bookkeeping failed')
        }
        log.info({ messageId: message.id, providerMessageId: result.providerMessageId }, 'sent')
      } catch (sendErr) {
        // The send claim (status 'sending') stays, so a retry won't re-send.
        await ctx.db.messages.update(message.id, {
          status: 'failed',
          errorReason: String((sendErr as Error).message).slice(0, 500),
        })
        log.error({ err: sendErr, messageId: message.id }, 'send failed')
      }
    },
  )
}

export const sequenceStepDue = inngest.createFunction(
  { id: 'sequence-step-due', retries: 3, triggers: [{ event: EVENT }] },
  async ({ event, runId }) => {
    await handleSequenceStepDue(event.data, runId)
  },
)
