import { schema } from '@tradepilot/db'
import type { Language } from '@tradepilot/shared'

type MessageRow = typeof schema.messages.$inferSelect

export interface DraftMessageDTO {
  id: string
  leadId: string | null
  leadCompany: string
  toAddress: string | null
  language: Language
  stepOrder: number
  stepKind: string
  subject: string
  bodyText: string
  subjectVariants: string[]
  status: MessageRow['status']
  generatedByAi: boolean
  spamLevel: 'low' | 'medium' | 'high'
  spamScore: number
  createdAt: string
}

export function toDraftMessageDTO(r: MessageRow, leadCompany: string): DraftMessageDTO {
  const m = r.aiMeta ?? {}
  return {
    id: r.id,
    leadId: r.leadId,
    leadCompany,
    toAddress: r.toAddress,
    language: r.language,
    stepOrder: m.stepOrder ?? 1,
    stepKind: m.stepKind ?? 'intro',
    subject: r.subject ?? '',
    bodyText: r.bodyText ?? '',
    subjectVariants: m.subjectVariants ?? [],
    status: r.status,
    generatedByAi: m.generatedByAi ?? false,
    spamLevel: m.spamLevel ?? 'low',
    spamScore: m.spamScore ?? 0,
    createdAt: r.createdAt.toISOString(),
  }
}
