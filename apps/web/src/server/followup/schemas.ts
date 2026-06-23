import { z } from 'zod'

export const TASK_STATUSES = ['open', 'in_progress', 'done', 'snoozed', 'cancelled'] as const
export const TASK_CADENCES = ['once', 'daily', 'weekly', 'biweekly', 'monthly'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskCadence = (typeof TASK_CADENCES)[number]

const statusSchema = z.enum(TASK_STATUSES)
const cadenceSchema = z.enum(TASK_CADENCES)

export const listFollowUpsSchema = z
  .object({ status: z.array(statusSchema).default(['open', 'in_progress']) })
  .default({})
export type ListFollowUpsInput = z.infer<typeof listFollowUpsSchema>

export const createFollowUpSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  cadence: cadenceSchema.default('once'),
  leadId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
})

export const updateFollowUpSchema = z.object({
  id: z.string().uuid(),
  status: statusSchema.optional(),
  dueDate: z.coerce.date().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
})
