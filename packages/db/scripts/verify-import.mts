/**
 * P1 acceptance verification: import ~1,000 rows against the live DB, exercising the
 * exact shared pipeline (parse -> map -> normalize -> dedupe -> ICP score) + the
 * tenant-scoped DAL, then query the leads back. Mirrors lib/import/run-import.ts.
 *
 * Cleans the tenant's leads first so the run is repeatable and leaves the DB tidy.
 *
 * Run from repo root:
 *   set -a; . apps/web/.env; set +a
 *   pnpm --filter @tradepilot/db exec tsx scripts/verify-import.mts
 */
import { isNull, desc, sql } from 'drizzle-orm'
import { ensureTenant, runInTenant, withTenantTransaction, schema } from '../src/index'
import {
  parseCsv,
  autoDetectMapping,
  applyMapping,
  planDedupe,
  buildScoringCatalog,
  scoreIcp,
  normalizeCompanyName,
  extractApexDomain,
  normalizeCountry,
  normalizeEmail,
} from '@tradepilot/shared/import'

const { leads, catalogItems } = schema

const COUNTRIES: [string, string, string][] = [
  ['Germany', 'de', 'GmbH'],
  ['Spain', 'es', 'SL'],
  ['France', 'fr', 'SARL'],
  ['Poland', 'pl', 'Sp. z o.o.'],
]
const INDUSTRIES = [
  'Food wholesale',
  'Grocery importer',
  'Deli distributor',
  'Condiment importer',
  'HoReCa supplier',
  'Pickle & preserves',
]
const TITLES = ['Head of Procurement', 'Buyer', 'Owner', 'Category Manager', 'Purchasing Director']
const CORE = [
  'Gherkin', 'Pickle', 'Gourmet', 'Provisions', 'Trading', 'Importers', 'Wholesale', 'Produce',
  'Pantry', 'Harvest', 'Cellar', 'Larder', 'Epicure', 'Foodworks', 'Marketplace', 'Stores',
  'Distributors', 'Merchants', 'Supplies', 'Exchange',
]

// High-entropy, dissimilar first token per row so fuzzy dedupe doesn't collapse distinct companies.
const code = (i: number) => ((i + 1) * 2654435761) >>> 0
const token = (i: number) => {
  const s = code(i).toString(36).padStart(6, '0').slice(-6)
  return s[0]!.toUpperCase() + s.slice(1)
}

const N = 1000
const rows = ['Company,Website,Country,Industry,Email,Title']
for (let i = 0; i < N; i++) {
  const [country, tld, suffix] = COUNTRIES[i % 4]!
  const domain = `importer${i}.${tld}`
  const local = i % 5 === 0 ? 'info' : 'buyer'
  const name = `${token(i)} ${CORE[i % CORE.length]} ${suffix}`
  rows.push(
    `${name},https://${domain},${country},${INDUSTRIES[i % INDUSTRIES.length]},${local}@${domain},${TITLES[i % TITLES.length]}`,
  )
}
// 15 exact-domain duplicates (reuse importer0..14) -> should be skipped by dedupe
for (let i = 0; i < 15; i++) {
  const [country, tld, suffix] = COUNTRIES[i % 4]!
  rows.push(
    `${token(i)} ${CORE[i % CORE.length]} ${suffix} (dup),https://importer${i}.${tld},${country},Food wholesale,info@importer${i}.${tld},Info`,
  )
}
const csv = rows.join('\n')

const sheet = parseCsv(csv)
const mapping = autoDetectMapping(sheet)
const mapped = applyMapping(sheet, mapping)

const partial = await ensureTenant({
  clerkOrgId: 'org_sdae_seed',
  clerkUserId: 'user_sdae_seed',
  role: 'owner',
  userEmail: 'info@tivor.us',
  orgName: 'Sri Durga Agro Exports',
})

// Clean any prior test leads for this tenant (RLS-scoped raw delete; cascades contacts/provenance).
await withTenantTransaction(partial.tenantId, (tx) =>
  tx.execute(sql`delete from leads where tenant_id = ${partial.tenantId}`),
)

const t0 = Date.now()
const result = await runInTenant(partial, async (ctx) => {
  const catalog = buildScoringCatalog(
    await ctx.db.catalogItems.findMany({ where: isNull(catalogItems.deletedAt), limit: 1000 }),
  )
  const existing = await ctx.db.leads.findMany({ where: isNull(leads.deletedAt), limit: 50_000 })
  const index = existing.map((l) => ({
    id: l.id,
    domain: l.domain,
    country: l.country,
    nameNorm: normalizeCompanyName(l.companyName),
  }))
  const candidates = mapped.map((m) => ({
    ...m,
    normDomain:
      extractApexDomain(m.lead.domain) ??
      extractApexDomain(m.lead.website) ??
      extractApexDomain(m.contact?.email),
    normCountry: normalizeCountry(m.lead.country),
  }))
  const decisions = planDedupe(
    candidates.map((c) => ({ domain: c.normDomain, companyName: c.lead.companyName, country: c.normCountry })),
    index,
  )

  let merged = 0
  let skipped = 0
  const toCreate: Record<string, unknown>[] = []
  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i]!
    const c = candidates[i]!
    if (!c.lead.companyName.trim()) continue
    if (d.action === 'skip') {
      skipped++
      continue
    }
    if (d.action === 'merge') {
      merged++
      continue
    }
    const email = normalizeEmail(c.contact?.email)
    const icp = scoreIcp(
      {
        companyName: c.lead.companyName,
        domain: c.normDomain,
        country: c.normCountry,
        website: c.lead.website,
        industry: c.lead.industry,
        contact: {
          email: email.email,
          emailIsValid: email.isValid,
          emailIsRole: email.isRole,
          title: c.contact?.title,
        },
      },
      { targetMarkets: ['DE', 'ES', 'FR', 'PL'], catalog },
    )
    toCreate.push({
      companyName: c.lead.companyName,
      domain: c.normDomain ?? null,
      website: c.lead.website ?? null,
      country: c.normCountry ?? null,
      industry: c.lead.industry ?? null,
      language: 'en',
      stage: 'new',
      source: 'csv_import',
      icpScore: icp.score,
      tags: [],
      enrichment: { icpReasons: icp.reasons },
    })
  }

  let created = 0
  for (let i = 0; i < toCreate.length; i += 500) {
    const ins = await ctx.db.leads.insertMany(toCreate.slice(i, i + 500) as never)
    created += ins.length
  }

  const total = await ctx.db.leads.count(isNull(leads.deletedAt))
  const top = await ctx.db.leads.findMany({
    where: isNull(leads.deletedAt),
    orderBy: desc(leads.icpScore),
    limit: 3,
  })
  const byStage = await ctx.db.leads.findMany({ where: isNull(leads.deletedAt), limit: 50_000 })
  const scores = byStage.map((l) => l.icpScore ?? 0)
  return {
    created,
    merged,
    skipped,
    totalLeadsInTenant: total,
    icpMin: Math.min(...scores),
    icpMax: Math.max(...scores),
    icpAvg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    topByIcp: top.map((l) => ({ company: l.companyName, country: l.country, icp: l.icpScore })),
  }
})

console.log(JSON.stringify({ parsedRows: mapped.length, ...result, ms: Date.now() - t0 }, null, 2))
process.exit(0)
