import 'server-only'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { env, flags } from '@tradepilot/shared/env'
import {
  renderFallbackDraft,
  buildFooter,
  scoreSpam,
  type DraftInput,
  type GeneratedDraft,
} from '@tradepilot/shared/outreach'

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

const LANG_NAMES: Record<DraftInput['language'], string> = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  pl: 'Polish',
}

const STEP_GUIDANCE: Record<DraftInput['step']['kind'], string> = {
  intro: 'First touch. Warm, specific intro; one clear soft CTA (samples or a short call).',
  follow_up: 'Short, polite follow-up to the first email. Add no pressure; keep it brief.',
  value: 'Add a concrete value point (specs, certifications, reliable lead times). One CTA.',
  breakup: 'Final, graceful closing-the-loop message. Low pressure, easy to re-engage.',
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1]! : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw
}

function buildPrompt(input: DraftInput): { system: string; user: string } {
  const system = [
    `You are an expert B2B export-sales copywriter. Write a concise cold email in ${LANG_NAMES[input.language]}.`,
    'Write natively in that language; it must NOT read like a translation.',
    'Rules: 60-110 words; professional and human; reference the buyer business and country;',
    'mention the most relevant products and certifications; exactly one clear, low-pressure CTA',
    '(offer samples or a short call); avoid spam-trigger words (free, act now, guarantee, click here,',
    'limited time, $$$); no ALL-CAPS, no exclamation spam. Do NOT include a signature block, unsubscribe',
    'line, or physical address; those are appended separately.',
    `Step intent: ${STEP_GUIDANCE[input.step.kind]}`,
    'Return STRICT JSON only, no markdown: {"subject": string, "subjectVariants": [string, string, string], "body": string}.',
  ].join(' ')

  const context = {
    buyer: {
      company: input.lead.companyName,
      country: input.lead.country,
      industry: input.lead.industry,
      website: input.lead.website,
      imports: input.lead.importSummary,
    },
    contact: input.contact,
    seller: {
      company: input.sender.companyName,
      about: input.sender.about,
      certifications: input.sender.certifications,
    },
    products: input.catalog.map((c) => ({
      name: c.name,
      grade: c.grade,
      packaging: c.packaging,
      hsCode: c.hsCode,
      certifications: c.certifications,
    })),
  }

  return { system, user: JSON.stringify(context) }
}

async function generateWithOpenAi(input: DraftInput): Promise<GeneratedDraft | null> {
  const client = getOpenAiClient()
  if (!client) return null
  const prompt = buildPrompt(input)
  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL_FAST,
    temperature: 0.3,
    max_tokens: 900,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
  })
  const text = completion.choices[0]?.message?.content ?? ''
  const parsed = JSON.parse(extractJson(text)) as {
    subject?: string
    subjectVariants?: string[]
    body?: string
  }
  const subject = (parsed.subject ?? '').trim()
  const variants = (parsed.subjectVariants ?? []).map((s) => String(s).trim()).filter(Boolean)
  if (!subject || !parsed.body) return null
  const bodyText = `${parsed.body.trim()}\n\n${buildFooter(input)}`
  return {
    subject,
    subjectVariants: variants.length ? variants : [subject],
    bodyText,
    spam: scoreSpam(subject, bodyText),
    generatedByAi: true,
    model: env.OPENAI_MODEL_FAST,
    tokensIn: completion.usage?.prompt_tokens,
    tokensOut: completion.usage?.completion_tokens,
  }
}

async function generateWithAnthropic(input: DraftInput): Promise<GeneratedDraft | null> {
  const client = getAnthropicClient()
  if (!client) return null
  const prompt = buildPrompt(input)
  const msg = await client.messages.create({
    model: env.ANTHROPIC_MODEL_FAST,
    max_tokens: 800,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  })
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const parsed = JSON.parse(extractJson(text)) as {
    subject?: string
    subjectVariants?: string[]
    body?: string
  }
  const subject = (parsed.subject ?? '').trim()
  const variants = (parsed.subjectVariants ?? []).map((s) => String(s).trim()).filter(Boolean)
  if (!subject || !parsed.body) return null
  const bodyText = `${parsed.body.trim()}\n\n${buildFooter(input)}`
  return {
    subject,
    subjectVariants: variants.length ? variants : [subject],
    bodyText,
    spam: scoreSpam(subject, bodyText),
    generatedByAi: true,
    model: env.ANTHROPIC_MODEL_FAST,
    tokensIn: msg.usage?.input_tokens,
    tokensOut: msg.usage?.output_tokens,
  }
}

/**
 * Generate a localized cold-email draft.
 * Provider order: OpenAI first, Anthropic fallback, then template fallback.
 */
export async function generateColdEmail(input: DraftInput): Promise<GeneratedDraft> {
  if (!flags.isAiEnabled) return renderFallbackDraft(input)
  try {
    const openAi = await generateWithOpenAi(input)
    if (openAi) return openAi
  } catch {
    // fall through to Anthropic / template fallback
  }
  try {
    const anthropic = await generateWithAnthropic(input)
    if (anthropic) return anthropic
  } catch {
    // fall through to template fallback
  }
  return renderFallbackDraft(input)
}
