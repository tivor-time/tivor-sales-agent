import { sequenceStepDue } from './sequence-step-due'
import { scheduledSendsSweep } from './scheduled-sends-sweep'
import { followupNudgeDue } from './followup-nudge-due'
import { followupsSweep } from './followups-sweep'
import { mailboxWarmupTick } from './mailbox-warmup-tick'
import { mailboxPoll } from './mailbox-poll'
import { mailboxPollIdentity } from './mailbox-poll-identity'
import { emailInboundReceived } from './email-inbound-received'
import { emailBounceReceived } from './email-bounce-received'
import { unipileMailingEvent } from './unipile-mailing-event'
import { unipileAccountStatus } from './unipile-account-status'

/**
 * The single registration surface passed to serve(). Append new handlers here as
 * later phases land (trade-data sync, weekly briefs, usage flush, import).
 */
export const functions = [
  sequenceStepDue,
  scheduledSendsSweep,
  followupNudgeDue,
  followupsSweep,
  mailboxWarmupTick,
  mailboxPoll,
  mailboxPollIdentity,
  emailInboundReceived,
  emailBounceReceived,
  unipileMailingEvent,
  unipileAccountStatus,
]
