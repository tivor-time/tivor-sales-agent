import 'server-only'
import { runInTenant, schema, getTenantProfile, type TenantContextPartial } from '@tradepilot/db'
import { and, eq, isNull } from 'drizzle-orm'
import {
  applyMapping,
  planDedupe,
  buildScoringCatalog,
  scoreIcp,
  normalizeCompanyName,
  extractApexDomain,
  normalizeCountry,
  normalizeEmail,
  normalizePhone,
  normalizeLanguage,
  type RawSheet,
  type ColumnMapping,
  type ImportReport,
  type ExistingLeadKey,
} from '@tradepilot/shared/import'

const { leads, catalogItems } = schema
const INSERT_BATCH = 500

type ProgressFn = (done: number, total: number) => void | Promise<void>

/**
 * Run a full lead import inside ONE tenant transaction (atomic + RLS-scoped):
 * normalize -> dedupe (vs existing + within batch) -> ICP score -> batched insert
 * of leads + provenance (+ primary contacts), with fill-blank merge for matches.
 */
export async function runImport(
  partial: TenantContextPartial,
  args: { sheet: RawSheet; mapping: ColumnMapping; fileName: string },
  onProgress?: ProgressFn,
): Promise<ImportReport> {
  const started = Date.now()
  const mapped = applyMapping(args.sheet, args.mapping)
  const report: ImportReport = {
    fileName: args.fileName,
    totalRows: args.sheet.meta.rowCount,
    parsed: mapped.length,
    created: 0,
    merged: 0,
    skipped: 0,
    invalid: 0,
    reviewFlagged: 0,
    contactsCreated: 0,
    durationMs: 0,
    errors: [],
  }

  return runInTenant(partial, async (ctx) => {
    const profile = await getTenantProfile(ctx.tenantId)

    // Scoring catalog (active items only), once.
    const catalogRows = await ctx.db.catalogItems.findMany({
      where: and(eq(catalogItems.active, true), isNull(catalogItems.deletedAt))!,
      limit: 1000,
    })
    const catalog = buildScoringCatalog(catalogRows)

    // Existing tenant leads -> in-memory dedupe index (one read).
    const existing = await ctx.db.leads.findMany({ where: isNull(leads.deletedAt), limit: 50_000 })
    const existingById = new Map(existing.map((l) => [l.id, l]))
    const index: ExistingLeadKey[] = existing.map((l) => ({
      id: l.id,
      domain: l.domain,
      country: l.country,
      nameNorm: normalizeCompanyName(l.companyName),
    }))

    // Normalize candidates.
    const candidates = mapped.map((m) => {
      const domain =
        extractApexDomain(m.lead.domain) ??
        extractApexDomain(m.lead.website) ??
        extractApexDomain(m.contact?.email)
      return { ...m, normDomain: domain, normCountry: normalizeCountry(m.lead.country) }
    })

    const decisions = planDedupe(
      candidates.map((c) => ({
        domain: c.normDomain,
        companyName: c.lead.companyName,
        country: c.normCountry,
      })),
      index,
    )

    const toCreate: {
      rowIndex: number
      raw: Record<string, string>
      value: Record<string, unknown>
    }[] = []

    for (let i = 0; i < decisions.length; i++) {
      const d = decisions[i]!
      const c = candidates[i]!
      if (!c.lead.companyName.trim()) {
        report.invalid++
        continue
      }
      if (d.action === 'skip') {
        report.skipped++
        continue
      }
      const email = normalizeEmail(c.contact?.email)
      const icp = scoreIcp(
        {
          companyName: c.lead.companyName,
          domain: c.normDomain,
          country: c.normCountry,
          city: c.lead.city,
          website: c.lead.website,
          industry: c.lead.industry,
          tags: c.lead.tags,
          contact: {
            email: email.email,
            emailIsValid: email.isValid,
            emailIsRole: email.isRole,
            title: c.contact?.title,
          },
        },
        { targetMarkets: profile.targetMarkets, catalog },
      )

      if (d.action === 'merge' && d.matchedLeadId) {
        const before = existingById.get(d.matchedLeadId)
        if (before) {
          const patch: Record<string, unknown> = {}
          const fill = (k: string, v: unknown) => {
            if (v != null && v !== '' && (before as Record<string, unknown>)[k] == null) patch[k] = v
          }
          fill('domain', c.normDomain)
          fill('website', c.lead.website)
          fill('country', c.normCountry)
          fill('region', c.lead.region)
          fill('city', c.lead.city)
          fill('industry', c.lead.industry)
          if (c.lead.tags?.length) {
            patch.tags = [...new Set([...(before.tags ?? []), ...c.lead.tags])]
          }
          if (Object.keys(patch).length) await ctx.db.leads.update(d.matchedLeadId, patch as never)
          await ctx.db.leadProvenance.insert({
            leadId: d.matchedLeadId,
            source: 'csv_import',
            provider: `csv:${args.fileName}`,
            rawPayload: c.raw,
            confidence: c.normDomain ? 90 : 60,
          } as never)
        }
        report.merged++
        continue
      }

      if (d.review) report.reviewFlagged++
      toCreate.push({
        rowIndex: c.rowIndex,
        raw: c.raw,
        value: {
          companyName: c.lead.companyName,
          domain: c.normDomain ?? null,
          website: c.lead.website ?? null,
          country: c.normCountry ?? null,
          region: c.lead.region ?? null,
          city: c.lead.city ?? null,
          language: normalizeLanguage(c.lead.language) ?? profile.defaultLanguage,
          industry: c.lead.industry ?? null,
          stage: 'new',
          source: 'csv_import',
          icpScore: icp.score,
          tags: c.lead.tags ?? [],
          enrichment: { icpReasons: icp.reasons, reviewMatch: d.review ?? false },
        },
      })
    }

    for (let i = 0; i < toCreate.length; i += INSERT_BATCH) {
      const batch = toCreate.slice(i, i + INSERT_BATCH)
      const inserted = await ctx.db.leads.insertMany(batch.map((b) => b.value) as never)
      await ctx.db.leadProvenance.insertMany(
        inserted.map((lead, j) => ({
          leadId: (lead as { id: string }).id,
          source: 'csv_import' as const,
          provider: `csv:${args.fileName}`,
          rawPayload: batch[j]!.raw,
          confidence: 100,
        })) as never,
      )
      for (let j = 0; j < inserted.length; j++) {
        const c = candidates[batch[j]!.rowIndex]!
        const em = normalizeEmail(c.contact?.email)
        if (em.isValid) {
          try {
            await ctx.db.contacts.insert({
              leadId: (inserted[j] as { id: string }).id,
              email: em.email,
              firstName: c.contact?.firstName ?? null,
              lastName: c.contact?.lastName ?? null,
              title: c.contact?.title ?? null,
              phone: normalizePhone(c.contact?.phone) ?? null,
              linkedinUrl: c.contact?.linkedinUrl ?? null,
              isPrimary: true,
              language: normalizeLanguage(c.lead.language) ?? profile.defaultLanguage,
              consent: { basis: 'legitimate_interest', capturedAt: new Date().toISOString() },
            } as never)
            report.contactsCreated++
          } catch {
            // unique(tenant,email) conflict -> contact already exists; skip.
          }
        }
      }
      report.created += inserted.length
      await onProgress?.(Math.min(i + INSERT_BATCH, toCreate.length), toCreate.length)
    }

    report.durationMs = Date.now() - started
    return report
  })
}
