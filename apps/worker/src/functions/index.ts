import { sequenceStepDue } from './sequence-step-due'
import { followupNudgeDue } from './followup-nudge-due'
import { mailboxWarmupTick } from './mailbox-warmup-tick'
import { mailboxPoll } from './mailbox-poll'
import { mailboxPollIdentity } from './mailbox-poll-identity'
import { emailInboundReceived } from './email-inbound-received'
import { emailBounceReceived } from './email-bounce-received'

/**
 * The single registration surface passed to serve(). Append new handlers here
 * as later phases land (sample feedback nudges, trade-data sync, weekly briefs,
 * usage flush, import processing).
 */
export const functions = [
  sequenceStepDue,
  followupNudgeDue,
  mailboxWarmupTick,
  mailboxPoll,
  mailboxPollIdentity,
  emailInboundReceived,
  emailBounceReceived,
]
