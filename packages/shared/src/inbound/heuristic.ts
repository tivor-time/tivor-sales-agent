import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from '../constants'
import type { InboundClassification, InboundClassificationInput, InquiryIntent } from './types'

/** Keyword → intent table. First-highest-hit-count wins; default 'other'. */
const INTENT_KEYWORDS: Record<InquiryIntent, string[]> = {
  price_request: ['price', 'pricing', 'quote', 'quotation', 'cost', 'fob', 'cif', 'cfr'],
  sample_request: ['sample', 'samples', 'swatch'],
  spec_request: ['spec', 'specification', 'datasheet', 'technical', 'composition', 'grade'],
  moq_request: ['moq', 'minimum order', 'minimum quantity', 'min order'],
  certification_request: ['certificate', 'certification', 'iso', 'haccp', 'halal', 'kosher', 'fda', 'fssai', 'coa'],
  logistics_request: ['shipping', 'freight', 'incoterm', 'delivery', 'container', 'lead time', 'logistics', 'port'],
  partnership: ['partner', 'partnership', 'distributor', 'reseller', 'agent', 'collaborat'],
  complaint: ['complaint', 'refund', 'damaged', 'defective', 'broken', 'disappoint'],
  unsubscribe: ['unsubscribe', 'opt out', 'opt-out', 'remove me', 'stop emailing', 'take me off'],
  out_of_office: ['out of office', 'automatic reply', 'auto-reply', 'on vacation', 'on holiday', 'away from my'],
  not_interested: ['not interested', 'no thanks', 'no thank you', 'no longer interested'],
  other: [],
}

const LANG_STOPWORDS: Record<Language, string[]> = {
  en: [' the ', ' and ', ' you ', ' please ', ' we ', ' your '],
  de: [' und ', ' der ', ' die ', ' das ', ' wir ', ' bitte ', ' ich '],
  es: [' el ', ' la ', ' los ', ' por favor ', ' gracias ', ' nosotros ', ' usted '],
  fr: [' le ', ' les ', ' nous ', ' merci ', ' vous ', ' bonjour ', ' votre '],
  pl: [' i ', ' na ', ' jest ', ' dziękuję ', ' proszę ', ' oraz '],
}

function guessLanguage(text: string): Language {
  const t = ` ${text.toLowerCase()} `
  let best: Language = DEFAULT_LANGUAGE
  let bestScore = 0
  for (const lang of SUPPORTED_LANGUAGES) {
    const score = LANG_STOPWORDS[lang].reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = lang
    }
  }
  return best
}

/** Zero-AI fallback classifier (keyword intent + stopword language guess). */
export function classifyInboundHeuristic(input: InboundClassificationInput): InboundClassification {
  const hay = `${input.subject}\n${input.bodyText}`.toLowerCase()
  let intent: InquiryIntent = 'other'
  let bestScore = 0
  for (const key of Object.keys(INTENT_KEYWORDS) as InquiryIntent[]) {
    if (key === 'other') continue
    const score = INTENT_KEYWORDS[key].reduce((n, kw) => n + (hay.includes(kw) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      intent = key
    }
  }
  return {
    intent,
    language: guessLanguage(`${input.subject} ${input.bodyText}`),
    budget: null,
    authority: null,
    need: null,
    timeline: null,
    requestedProducts: [],
    icpScore: null,
    summary: input.bodyText.trim().slice(0, 200),
    classifiedByAi: false,
  }
}
