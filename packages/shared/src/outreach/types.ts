import type { Language } from '../constants'

/** Sequence step framing — drives both the AI prompt and the fallback template. */
export type StepKind = 'intro' | 'follow_up' | 'value' | 'breakup'

/** The default 4-step cold sequence cadence (Day 1 / 3 / 7 / 14). */
export const DEFAULT_SEQUENCE_STEPS: { stepOrder: number; dayOffset: number; kind: StepKind }[] = [
  { stepOrder: 1, dayOffset: 0, kind: 'intro' },
  { stepOrder: 2, dayOffset: 3, kind: 'follow_up' },
  { stepOrder: 3, dayOffset: 7, kind: 'value' },
  { stepOrder: 4, dayOffset: 14, kind: 'breakup' },
]

export interface DraftLead {
  companyName: string
  country?: string | null
  industry?: string | null
  domain?: string | null
  website?: string | null
  /** what they import / from whom, when trade data is present */
  importSummary?: string | null
}

export interface DraftContact {
  firstName?: string | null
  lastName?: string | null
  title?: string | null
}

export interface DraftCatalogItem {
  name: string
  grade?: string | null
  packaging?: string | null
  certifications?: string[]
  hsCode?: string | null
}

export interface DraftSenderProfile {
  companyName: string
  about?: string
  certifications?: string[]
  website?: string
  /** physical postal address — required in the footer for email-law compliance */
  physicalAddress?: string
}

export interface DraftStep {
  stepOrder: number
  dayOffset: number
  kind: StepKind
}

export interface DraftInput {
  language: Language
  lead: DraftLead
  contact?: DraftContact
  sender: DraftSenderProfile
  catalog: DraftCatalogItem[]
  step: DraftStep
  unsubscribeUrl: string
}

export interface SpamReport {
  score: number
  level: 'low' | 'medium' | 'high'
  hits: string[]
}

export interface GeneratedDraft {
  subject: string
  subjectVariants: string[]
  bodyText: string
  spam: SpamReport
  generatedByAi: boolean
  model?: string
  tokensIn?: number
  tokensOut?: number
}
