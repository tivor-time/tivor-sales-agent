/**
 * Inngest event payload schemas.
 *
 * EVERY tenant-affecting event REQUIRES a tenantId so a missing id is a Zod
 * parse error — the worker can never fan out into silent global access.
 */
import { z } from 'zod'

const tenantScoped = z.object({
  tenantId: z.string().uuid(),
  /** optional acting user; defaults to the system actor in the worker */
  actorUserId: z.string().uuid().optional(),
})

export const eventSchemas = {
  'sequence/step.due': tenantScoped.extend({
    messageId: z.string().uuid().optional(),
    sequenceStepId: z.string().uuid(),
    leadId: z.string().uuid(),
    contactId: z.string().uuid().optional(),
  }),
  'followup/nudge.due': tenantScoped.extend({
    followUpTaskId: z.string().uuid(),
  }),
  'sample/feedback.nudge': tenantScoped.extend({
    sampleId: z.string().uuid(),
  }),
  'tradedata/sync.requested': tenantScoped.extend({
    provider: z.string().optional(),
  }),
  'brief/weekly.generate': tenantScoped.extend({
    markets: z.array(z.string()).optional(),
  }),
  'mailbox/warmup.tick': tenantScoped.extend({
    emailIdentityId: z.string().uuid(),
  }),
  'email/bounce.received': tenantScoped.extend({
    messageId: z.string().uuid().optional(),
    address: z.string(),
  }),
  'email/inbound.received': tenantScoped.extend({
    emailIdentityId: z.string().uuid(),
    providerMessageId: z.string(),
  }),
  'usage/flush.requested': tenantScoped,
} as const

export type EventName = keyof typeof eventSchemas

export type EventPayload<T extends EventName> = z.infer<(typeof eventSchemas)[T]>

/** Parse + validate an event payload, throwing on a missing/invalid tenantId. */
export function parseEvent<T extends EventName>(name: T, data: unknown): EventPayload<T> {
  return eventSchemas[name].parse(data) as EventPayload<T>
}
