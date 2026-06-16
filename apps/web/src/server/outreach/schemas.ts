import { z } from 'zod'

export const generateDraftsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  leadIds: z.array(z.string().uuid()).min(1).max(50),
})
export type GenerateDraftsInput = z.infer<typeof generateDraftsSchema>

export const editDraftSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().trim().min(1).max(300),
  bodyText: z.string().trim().min(1).max(8000),
})

export const messageIdSchema = z.object({ id: z.string().uuid() })
export const bulkApproveSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) })
