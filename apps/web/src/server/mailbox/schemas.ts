import { z } from 'zod'

export const mailboxIdSchema = z.object({ id: z.string().uuid() })
export const setSendingSchema = z.object({ id: z.string().uuid(), enabled: z.boolean() })

export type MailboxIdInput = z.infer<typeof mailboxIdSchema>
export type SetSendingInput = z.infer<typeof setSendingSchema>
