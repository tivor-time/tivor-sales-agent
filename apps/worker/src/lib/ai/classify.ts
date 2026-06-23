import Anthropic from '@anthropic-ai/sdk'
import { env, flags } from '@tradepilot/shared/env'
import { SUPPORTED_LANGUAGES, type Language } from '@tradepilot/shared'
import {
  classifyInboundHeuristic,
  extractJson,
  INQUIRY_INTENTS,
  type InboundClassification,
  type InboundClassificationInput,
  type InquiryIntent,
} from '@tradepilot/shared/inbound'

let client: Anthropic | null | undefined
function getClient(): Anthropic | null {
  if (client === undefined) {
    client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null
  }
  return client
}

const SYSTEM = [
  'You triage inbound B2B trade emails — replies from importer/buyer companies to an export business.',
  'Classify the message and extract BANT signals. Return STRICT JSON only, no markdown:',
  '{"intent": one of ["price_request","sample_request","spec_request","moq_request","certification_request","logistics_request","partnership","complaint","unsubscribe","out_of_office","not_interested","other"],',
  '"language": "en"|"de"|"es"|"fr"|"pl", "budget": string|null, "authority": string|null, "need": string|null,',
  '"timeline": string|null, "requestedProducts": string[], "icpScore": number 0-100, "summary": string (<=240 chars)}.',
  'budget/authority/need/timeline: a short phrase if the email implies it, else null.',
  'icpScore: how strong a real buying fit this looks, 0-100. requestedProducts: product names/types the buyer asks about.',
].join(' ')

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * AI inbound classifier. Uses Claude (volume model) when keyed; otherwise (and on
 * any AI/parse error) falls back to the shared heuristic — triage always produces
 * a classification, degrading gracefully.
 */
export async function classifyInbound(
  input: InboundClassificationInput,
): Promise<InboundClassification> {
  const anthropic = getClient()
  if (!flags.isAiEnabled || !anthropic) return classifyInboundHeuristic(input)
  try {
    const msg = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL_FAST,
      max_tokens: 700,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            subject: input.subject,
            body: input.bodyText.slice(0, 6000),
            from: input.fromAddress,
          }),
        },
      ],
    })
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const p = JSON.parse(extractJson(text)) as Record<string, unknown>
    const intent: InquiryIntent = INQUIRY_INTENTS.includes(p.intent as InquiryIntent)
      ? (p.intent as InquiryIntent)
      : 'other'
    const language: Language = SUPPORTED_LANGUAGES.includes(p.language as Language)
      ? (p.language as Language)
      : 'en'
    const icpScore =
      typeof p.icpScore === 'number' ? Math.max(0, Math.min(100, Math.round(p.icpScore))) : null
    return {
      intent,
      language,
      budget: str(p.budget),
      authority: str(p.authority),
      need: str(p.need),
      timeline: str(p.timeline),
      requestedProducts: Array.isArray(p.requestedProducts)
        ? p.requestedProducts.filter((x): x is string => typeof x === 'string')
        : [],
      icpScore,
      summary: str(p.summary) ?? input.bodyText.trim().slice(0, 200),
      classifiedByAi: true,
      model: env.ANTHROPIC_MODEL_FAST,
      tokensIn: msg.usage?.input_tokens,
      tokensOut: msg.usage?.output_tokens,
    }
  } catch {
    return classifyInboundHeuristic(input)
  }
}
