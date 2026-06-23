import type { Language } from '../constants'

/** Inbound inquiry intents — mirrors inquiryIntentEnum in packages/db enums. */
export type InquiryIntent =
  | 'price_request'
  | 'sample_request'
  | 'spec_request'
  | 'moq_request'
  | 'certification_request'
  | 'logistics_request'
  | 'partnership'
  | 'complaint'
  | 'unsubscribe'
  | 'out_of_office'
  | 'not_interested'
  | 'other'

export const INQUIRY_INTENTS: readonly InquiryIntent[] = [
  'price_request',
  'sample_request',
  'spec_request',
  'moq_request',
  'certification_request',
  'logistics_request',
  'partnership',
  'complaint',
  'unsubscribe',
  'out_of_office',
  'not_interested',
  'other',
]

export interface InboundClassificationInput {
  subject: string
  bodyText: string
  fromAddress?: string
}

export interface InboundClassification {
  intent: InquiryIntent
  language: Language
  budget: string | null
  authority: string | null
  need: string | null
  timeline: string | null
  requestedProducts: string[]
  icpScore: number | null
  summary: string
  classifiedByAi: boolean
  model?: string
  tokensIn?: number
  tokensOut?: number
}

/** Extract a JSON object from a (possibly fenced) LLM text response. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1]! : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw
}
