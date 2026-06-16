import type { IcpScore } from '../types'

export interface ScoringCatalog {
  categories: string[]
  grades: string[]
  hsCodes: string[]
  keywords: string[]
  certifications: string[]
}

export interface ScoringContext {
  targetMarkets: string[]
  catalog: ScoringCatalog
}

export interface ScorableLead {
  companyName: string
  domain?: string
  country?: string
  city?: string
  website?: string
  industry?: string
  tags?: string[]
  hsCode?: string
  contact?: { email?: string; emailIsValid?: boolean; emailIsRole?: boolean; title?: string }
}

const NEARBY = new Set(['NL', 'AT', 'BE', 'CH', 'IT', 'CZ', 'DK', 'SE'])
const DM_TITLE = /\b(buyer|purchas|procure|import|category|head|director|owner|ceo|founder|managing|md|gm)\b/i
const FIT_WORDS = [
  'gherkin',
  'pickle',
  'brine',
  'vinegar',
  'condiment',
  'deli',
  'foodservice',
  'wholesale',
  'importer',
  'distributor',
  'retail',
  'grocery',
  'horeca',
]

/** Deterministic ICP score (0-100 + reasons) per the rubric. */
export function scoreIcp(lead: ScorableLead, ctx: ScoringContext): IcpScore {
  const reasons: string[] = []
  let score = 0
  const hay = [lead.companyName, lead.industry, ...(lead.tags ?? [])].join(' ').toLowerCase()
  const fitTerms = [
    ...new Set([...ctx.catalog.categories, ...ctx.catalog.grades, ...ctx.catalog.keywords, ...FIT_WORDS]),
  ]
    .map((w) => w.toLowerCase())
    .filter(Boolean)

  // 1. target market
  if (lead.country && ctx.targetMarkets.includes(lead.country)) {
    score += 30
    reasons.push(`In target market ${lead.country} (+30)`)
  } else if (lead.country && NEARBY.has(lead.country)) {
    score += 15
    reasons.push(`Adjacent EU market ${lead.country} (+15)`)
  } else if (!lead.country) {
    score += 5
    reasons.push('Country unknown (+5)')
  }

  // 2. industry / catalog fit
  const hits = fitTerms.filter((w) => hay.includes(w)).length
  if (hits >= 2) {
    score += 25
    reasons.push(`Strong catalog/industry fit (${hits} signals, +25)`)
  } else if (hits === 1) {
    score += 15
    reasons.push('Catalog/industry fit (+15)')
  }

  // 3. HS alignment
  if (lead.hsCode || ctx.catalog.hsCodes.length) {
    score += 10
    reasons.push('HS-code alignment (+10)')
  }

  // 4. decision-maker contact
  if (
    lead.contact?.emailIsValid &&
    !lead.contact.emailIsRole &&
    lead.contact.title &&
    DM_TITLE.test(lead.contact.title)
  ) {
    score += 15
    reasons.push('Decision-maker contact present (+15)')
  } else if (lead.contact?.emailIsValid && !lead.contact.emailIsRole) {
    score += 8
    reasons.push('Direct contact email (+8)')
  } else if (lead.contact?.emailIsValid) {
    score += 3
    reasons.push('Role-based contact email (+3)')
  }

  // 5. domain / email quality
  if (lead.domain) {
    score += 6
    reasons.push('Has corporate domain (+6)')
    const cd = lead.contact?.email?.split('@')[1]
    if (cd && cd === lead.domain) {
      score += 4
      reasons.push('Contact email on company domain (+4)')
    }
  }

  // 6. completeness
  const present = [lead.website, lead.country, lead.city, lead.industry].filter(Boolean).length
  const comp = Math.round((present / 4) * 10)
  if (comp) {
    score += comp
    reasons.push(`Profile completeness (+${comp})`)
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons }
}

export function buildScoringCatalog(
  items: {
    category?: string | null
    grade?: string | null
    hsCode?: string | null
    certifications?: string[]
    name?: string | null
  }[],
): ScoringCatalog {
  const dedupe = (xs: (string | null | undefined)[]) =>
    [...new Set(xs.filter((x): x is string => !!x))]
  return {
    categories: dedupe(items.map((i) => i.category)),
    grades: dedupe(items.map((i) => i.grade)),
    hsCodes: dedupe(items.map((i) => i.hsCode)),
    keywords: dedupe(items.flatMap((i) => (i.name ?? '').toLowerCase().split(/\W+/))),
    certifications: dedupe(items.flatMap((i) => i.certifications ?? [])),
  }
}
