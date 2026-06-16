import { normalizeCompanyName } from './normalize'
import { nameMatchScore, DEDUPE_MERGE_THRESHOLD, DEDUPE_REVIEW_THRESHOLD } from './similarity'
import type { ExistingLeadKey, DedupeDecision } from './types'

interface Candidate {
  domain?: string
  companyName: string
  country?: string
}

/**
 * Pure create/merge/skip decisions against existing tenant leads + earlier batch rows.
 * - exact domain hit on an existing lead     -> merge (idempotent re-import)
 * - exact domain seen earlier in this batch  -> skip (first row wins)
 * - fuzzy name >= MERGE (same country)       -> merge
 * - fuzzy name in [REVIEW, MERGE)            -> create + review flag (never silent merge)
 * - else                                     -> create
 */
export function planDedupe(candidates: Candidate[], existing: ExistingLeadKey[]): DedupeDecision[] {
  const byDomain = new Map<string, string>()
  const byNameCountry: ExistingLeadKey[] = []
  for (const e of existing) {
    if (e.domain) byDomain.set(e.domain, e.id)
    byNameCountry.push(e)
  }
  const seenDomains = new Map<string, number>()
  const seenNames: { rowIndex: number; nameNorm: string; country?: string }[] = []
  const decisions: DedupeDecision[] = []

  candidates.forEach((c, rowIndex) => {
    const nameNorm = normalizeCompanyName(c.companyName)

    if (c.domain && byDomain.has(c.domain)) {
      decisions.push({
        rowIndex,
        action: 'merge',
        matchedLeadId: byDomain.get(c.domain),
        matchedBy: 'domain',
      })
      return
    }
    if (c.domain && seenDomains.has(c.domain)) {
      decisions.push({ rowIndex, action: 'skip', matchedBy: 'domain' })
      return
    }

    let best = { id: '', score: 0 }
    for (const e of byNameCountry) {
      if (c.country && e.country && c.country !== e.country) continue
      const s = nameMatchScore(nameNorm, e.nameNorm)
      if (s > best.score) best = { id: e.id, score: s }
    }
    if (best.score >= DEDUPE_MERGE_THRESHOLD) {
      decisions.push({
        rowIndex,
        action: 'merge',
        matchedLeadId: best.id,
        matchedBy: 'name',
        score: best.score,
      })
      return
    }

    const batchDup = seenNames.find(
      (p) =>
        (!c.country || !p.country || c.country === p.country) &&
        nameMatchScore(nameNorm, p.nameNorm) >= DEDUPE_MERGE_THRESHOLD,
    )
    if (batchDup) {
      decisions.push({ rowIndex, action: 'skip', matchedBy: 'name' })
      return
    }

    decisions.push({
      rowIndex,
      action: 'create',
      review: best.score >= DEDUPE_REVIEW_THRESHOLD,
      score: best.score || undefined,
    })
    if (c.domain) seenDomains.set(c.domain, rowIndex)
    seenNames.push({ rowIndex, nameNorm, country: c.country })
  })

  return decisions
}
