import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { env, flags } from '@tradepilot/shared/env'
import {
  renderFallbackDraft,
  buildFooter,
  scoreSpam,
  type DraftInput,
  type GeneratedDraft,
} from '@tradepilot/shared/outreach'

let client: Anthropic | null | undefined
function getClient(): Anthropic | null {
  if (client === undefined) {
    client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null
  }
  return client
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
  breakup: 'Final, graceful "closing the loop" message. Low pressure, easy to re-engage.',
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1]! : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw
}

/**
 * Generate a localized cold-email draft. Uses Claude (volume model) when an
 * Anthropic key is configured; otherwise (and on any AI error) falls back to the
 * native localized template — so drafting always works, degrading gracefully.
 */
export async function generateColdEmail(input: DraftInput): Promise<GeneratedDraft> {
  const anthropic = getClient()
  if (!flags.isAiEnabled || !anthropic) return renderFallbackDraft(input)

  const system = [
    `You are an expert B2B export-sales copywriter. Write a concise cold email in ${LANG_NAMES[input.language]}.`,
    'Write natively in that language — it must NOT read like a translation.',
    'Rules: 60–110 words; professional and human; reference the buyer’s business and country;',
    'mention the most relevant product(s) and certifications; exactly one clear, low-pressure CTA',
    '(offer samples or a short call); AVOID spam-trigger words (free, act now, guarantee, click here,',
    'limited time, $$$); no ALL-CAPS, no exclamation spam. Do NOT include a signature block, unsubscribe',
    'line, or physical address — those are appended separately.',
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

  try {
    const msg = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL_FAST,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: JSON.stringify(context) }],
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
    const bodyText = `${(parsed.body ?? '').trim()}\n\n${buildFooter(input)}`
    if (!subject || !parsed.body) return renderFallbackDraft(input)
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
  } catch {
    // Any AI failure (rate limit, parse error, outage) -> never block; use the template.
    return renderFallbackDraft(input)
  }
}
