import type { SpamReport } from './types'

/** Common spam-trigger words/phrases that hurt cold-email deliverability. */
const SPAM_TERMS = [
  'free', 'act now', 'limited time', 'urgent', 'click here', 'buy now', 'order now',
  'cash', 'cheap', 'discount', 'lowest price', 'best price', 'guarantee', 'guaranteed',
  'risk-free', 'no obligation', 'winner', 'congratulations', 'you have been selected',
  'special promotion', 'offer expires', '100% free', 'money back', 'earn money',
  'make money', 'extra income', 'amazing', 'incredible deal', 'once in a lifetime',
  'this is not spam', 'dear friend', 'apply now', 'call now', 'double your',
]

/**
 * Heuristic spam scorer for a subject + body. Higher = riskier deliverability.
 * Counts spam terms, ALL-CAPS shouting, excessive punctuation, and money symbols.
 */
export function scoreSpam(subject: string, body: string): SpamReport {
  const text = `${subject}\n${body}`
  const lower = text.toLowerCase()
  const hits: string[] = []

  for (const term of SPAM_TERMS) {
    if (lower.includes(term)) hits.push(term)
  }
  let score = hits.length * 2

  // ALL-CAPS words (len >= 4)
  const capsWords = text.match(/\b[A-Z]{4,}\b/g) ?? []
  if (capsWords.length) {
    score += capsWords.length
    hits.push(`${capsWords.length} ALL-CAPS word(s)`)
  }
  // excessive exclamation
  const bangs = (text.match(/!/g) ?? []).length
  if (bangs > 1) {
    score += bangs - 1
    hits.push(`${bangs} exclamation marks`)
  }
  // money symbols / percent-off
  if (/\$\$|\$\d|\d+%\s*off|€€/.test(lower)) {
    score += 2
    hits.push('money / %-off pattern')
  }

  const level: SpamReport['level'] = score >= 7 ? 'high' : score >= 3 ? 'medium' : 'low'
  return { score, level, hits }
}
