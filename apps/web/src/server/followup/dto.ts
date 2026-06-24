import { schema } from '@tradepilot/db'

type Row = typeof schema.followUpTasks.$inferSelect

export interface FollowUpDTO {
  id: string
  title: string
  description: string | null
  status: Row['status']
  cadence: Row['cadence']
  dueDate: string | null
  leadId: string | null
  leadCompany: string | null
  createdAt: string
}

export function toFollowUpDTO(t: Row, leadCompany: string | null): FollowUpDTO {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    cadence: t.cadence,
    dueDate: t.dueDate?.toISOString() ?? null,
    leadId: t.leadId,
    leadCompany,
    createdAt: t.createdAt.toISOString(),
  }
}
