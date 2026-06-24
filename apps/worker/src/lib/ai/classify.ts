import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { env, flags } from '@tradepilot/shared/env'
import { log } from '../logger'
import { SUPPORTED_LANGUAGES, type Language } from '@tradepilot/shared'
import {
  classifyInboundHeuristic,
  extractJson,
  INQUIRY_INTENTS,
  type InboundClassification,
  type InboundClassificationInput,
  type InquiryIntent,
} from '@tradepilot/shared/inbound'

let openAiClient: OpenAI | null | undefined
let anthropicClient: Anthropic | null | undefined

function getOpenAiClient(): OpenAI | null {
  if (openAiClient === undefined) {
    openAiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null
  }
  return openAiClient
}

function getAnthropicClient(): Anthropic | null {
  if (anthropicClient === undefined) {
    anthropicClient = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null
  }
  return anthropicClient
}

const SYSTEM = [
  'You triage inbound B2B trade emails, replies from importer or buyer companies to an export business.',
  'Classify the message and extract BANT signals. Return STRICT JSON only, no markdown:',
  '{"intent": one of ["price_request","sample_request","spec_request","moq_request","certification_request","logistics_request","partnership","complaint","unsubscribe","out_of_office","not_interested","other"],',
  '"language": "en"|"de"|"es"|"fr"|"pl", "budget": string|null, "authority": string|null, "need": string|null,',
  '"timeline": string|null, "requestedProducts": string[], "icpScore": number 0-100, "summary": string (<=240 chars)}.',
  'budget/authority/need/timeline: a short phrase if the email implies it, else null.',
  'icpScore: how strong a real buying fit this looks, 0-100. requestedProducts: product names/types the buyer asks about.',
].join(' ')

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

function parseOutput(
  parsed: Record<string, unknown>,
  input: InboundClassificationInput,
  meta: { model: string; tokensIn?: number; tokensOut?: number },
): InboundClassification {
  const intent: InquiryIntent = INQUIRY_INTENTS.includes(parsed.intent as InquiryIntent)
    ? (parsed.intent as InquiryIntent)
    : 'other'
  const language: Language = SUPPORTED_LANGUAGES.includes(parsed.language as Language)
    ? (parsed.language as Language)
    : 'en'
  const icpScore =
    typeof parsed.icpScore === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.icpScore))) : null

  return {
    intent,
    language,
    budget: str(parsed.budget),
    authority: str(parsed.authority),
    need: str(parsed.need),
    timeline: str(parsed.timeline),
    requestedProducts: Array.isArray(parsed.requestedProducts)
      ? parsed.requestedProducts.filter((x): x is string => typeof x === 'string')
      : [],
    icpScore,
    summary: str(parsed.summary) ?? input.bodyText.trim().slice(0, 200),
    classifiedByAi: true,
    model: meta.model,
    tokensIn: meta.tokensIn,
    tokensOut: meta.tokensOut,
  }
}

async function classifyWithOpenAi(
  input: InboundClassificationInput,
): Promise<InboundClassification | null> {
  const client = getOpenAiClient()
  if (!client) return null
  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL_FAST,
    temperature: 0,
    max_tokens: 800,
    messages: [
      { role: 'system', content: SYSTEM },
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
  const text = completion.choices[0]?.message?.content ?? ''
  if (!text) return null
  const parsed = JSON.parse(extractJson(text)) as Record<string, unknown>
  return parseOutput(parsed, input, {
    model: env.OPENAI_MODEL_FAST,
    tokensIn: completion.usage?.prompt_tokens,
    tokensOut: completion.usage?.completion_tokens,
  })
}

async function classifyWithAnthropic(
  input: InboundClassificationInput,
): Promise<InboundClassification | null> {
  const client = getAnthropicClient()
  if (!client) return null
  const msg = await client.messages.create({
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
  if (!text) return null
  const parsed = JSON.parse(extractJson(text)) as Record<string, unknown>
  return parseOutput(parsed, input, {
    model: env.ANTHROPIC_MODEL_FAST,
    tokensIn: msg.usage?.input_tokens,
    tokensOut: msg.usage?.output_tokens,
  })
}

/**
 * AI inbound classifier.
 * Provider order: OpenAI first, Anthropic fallback, then heuristic fallback.
 */
export async function classifyInbound(
  input: InboundClassificationInput,
): Promise<InboundClassification> {
  if (!flags.isAiEnabled) return classifyInboundHeuristic(input)
  try {
    const openAi = await classifyWithOpenAi(input)
    if (openAi) return openAi
  } catch (err) {
    // Don't fail triage on a provider error — but surface WHY we fell back, so a
    // bad key / model / quota doesn't silently degrade every inquiry to heuristic.
    log.warn(
      { provider: 'openai', model: env.OPENAI_MODEL_FAST, err: (err as Error)?.message ?? String(err) },
      'AI classify failed; trying fallback',
    )
  }
  try {
    const anthropic = await classifyWithAnthropic(input)
    if (anthropic) return anthropic
  } catch (err) {
    log.warn(
      { provider: 'anthropic', model: env.ANTHROPIC_MODEL_FAST, err: (err as Error)?.message ?? String(err) },
      'AI classify failed; using heuristic',
    )
  }
  return classifyInboundHeuristic(input)
}
