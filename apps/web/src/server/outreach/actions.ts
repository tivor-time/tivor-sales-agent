'use server'

import { runInTenant, schema, getTenantProfile } from '@tradepilot/db'
import { and, eq, isNull, inArray, desc } from 'drizzle-orm'
import { env } from '@tradepilot/shared/env'
import { DEFAULT_SEQUENCE_STEPS, scoreSpam, type DraftCatalogItem } from '@tradepilot/shared/outreach'
import type { Language } from '@tradepilot/shared'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, type Result } from '@/server/result'
import { generateColdEmail } from '@/lib/ai/draft'
import { toDraftMessageDTO, type DraftMessageDTO } from './dto'
import {
  generateDraftsSchema,
  editDraftSchema,
  messageIdSchema,
  bulkApproveSchema,
} from './schemas'

const { leads, contacts, catalogItems, messages } = schema

interface PendingDraft {
  leadId: string
  contactId: string | null
  toAddress: string | null
  language: Language
  stepOrder: number
  stepKind: string
  subject: string
  bodyText: string
  aiMeta: Record<string, unknown>
}

/**
 * Create a campaign + default 4-step sequence and generate a localized draft per
 * (lead, step) in the buyer's language. AI calls happen OUTSIDE the DB transaction
 * (read -> generate -> write) so we never hold a connection open during I/O.
 * Drafts land as `pending_approval` — nothing is queued/sent without human approval.
 */
export async function generateCampaignDrafts(
  input: unknown,
): Promise<Result<{ campaignId: string; leads: number; drafts: number }>> {
  return withAction(async () => {
    const { name, leadIds } = generateDraftsSchema.parse(input)
    const partial = await resolveTenantContext()

    // Phase A — read sender profile, catalog, leads + contacts (short tx).
    const data = await runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const profile = await getTenantProfile(ctx.tenantId)
      const catalogRows = await ctx.db.catalogItems.findMany({
        where: and(eq(catalogItems.active, true), isNull(catalogItems.deletedAt))!,
        limit: 200,
      })
      const leadRows = await ctx.db.leads.findMany({
        where: and(inArray(leads.id, leadIds), isNull(leads.deletedAt))!,
        limit: leadIds.length,
      })
      const contactRows = leadRows.length
        ? await ctx.db.contacts.findMany({
            where: and(
              inArray(
                contacts.leadId,
                leadRows.map((l) => l.id),
              ),
              isNull(contacts.deletedAt),
            )!,
            limit: 2000,
          })
        : []
      return { profile, catalogRows, leadRows, contactRows }
    })
    if (!data.leadRows.length) throw new NotFoundError('No leads found to draft for.')

    const cp = data.profile.companyProfile as {
      legalName?: string
      about?: string
      certifications?: string[]
      website?: string
      physicalAddress?: string
    }
    const sender = {
      companyName: data.profile.name || cp.legalName || 'Our company',
      about: cp.about,
      certifications: cp.certifications ?? [],
      website: cp.website,
      physicalAddress: cp.physicalAddress,
    }
    const catalog: DraftCatalogItem[] = data.catalogRows.map((c) => ({
      name: c.name,
      grade: c.grade,
      packaging: c.packaging,
      certifications: c.certifications,
      hsCode: c.hsCode,
    }))
    const primaryContact = (leadId: string) => {
      const cs = data.contactRows.filter((c) => c.leadId === leadId)
      return cs.find((c) => c.isPrimary) ?? cs[0]
    }

    // Phase B — generate drafts OUTSIDE any transaction (AI / template).
    const pending: PendingDraft[] = []
    for (const lead of data.leadRows) {
      const contact = primaryContact(lead.id)
      const unsubscribeUrl = `${env.APP_URL}/u/${contact?.id ?? lead.id}`
      for (const step of DEFAULT_SEQUENCE_STEPS) {
        const draft = await generateColdEmail({
          language: lead.language,
          lead: {
            companyName: lead.companyName,
            country: lead.country,
            industry: lead.industry,
            domain: lead.domain,
            website: lead.website,
            importSummary: (lead.enrichment as { importSummary?: string })?.importSummary ?? null,
          },
          contact: contact
            ? { firstName: contact.firstName, lastName: contact.lastName, title: contact.title }
            : undefined,
          sender,
          catalog,
          step,
          unsubscribeUrl,
        })
        pending.push({
          leadId: lead.id,
          contactId: contact?.id ?? null,
          toAddress: contact?.email ?? null,
          language: lead.language,
          stepOrder: step.stepOrder,
          stepKind: step.kind,
          subject: draft.subject,
          bodyText: draft.bodyText,
          aiMeta: {
            model: draft.model,
            tokensIn: draft.tokensIn,
            tokensOut: draft.tokensOut,
            generatedByAi: draft.generatedByAi,
            stepOrder: step.stepOrder,
            stepKind: step.kind,
            subjectVariants: draft.subjectVariants,
            spamLevel: draft.spam.level,
            spamScore: draft.spam.score,
          },
        })
      }
    }

    // Phase C — persist campaign + sequence + steps + messages (short tx).
    return runInTenant(partial, async (ctx) => {
      const campaign = await ctx.db.campaigns.insert({
        name,
        status: 'active',
        defaultLanguage: data.profile.defaultLanguage,
      } as never)
      const sequence = await ctx.db.sequences.insert({
        campaignId: campaign.id,
        name: 'Default 4-step sequence',
        language: data.profile.defaultLanguage,
      } as never)
      const stepIdByOrder = new Map<number, string>()
      for (const s of DEFAULT_SEQUENCE_STEPS) {
        const row = await ctx.db.sequenceSteps.insert({
          sequenceId: sequence.id,
          stepOrder: s.stepOrder,
          dayOffset: s.dayOffset,
          channel: 'email',
          language: data.profile.defaultLanguage,
        } as never)
        stepIdByOrder.set(s.stepOrder, row.id)
      }
      const values = pending.map((p) => ({
        campaignId: campaign.id,
        sequenceStepId: stepIdByOrder.get(p.stepOrder)!,
        leadId: p.leadId,
        contactId: p.contactId,
        direction: 'outbound',
        status: 'pending_approval',
        language: p.language,
        toAddress: p.toAddress,
        subject: p.subject,
        bodyText: p.bodyText,
        aiMeta: p.aiMeta,
      }))
      const inserted = await ctx.db.messages.insertMany(values as never)
      return { campaignId: campaign.id, leads: data.leadRows.length, drafts: inserted.length }
    })
  })
}

/** All drafts awaiting approval, with the lead company name resolved. */
export async function listPendingDrafts(): Promise<Result<DraftMessageDTO[]>> {
  return withAction(async () => {
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const rows = await ctx.db.messages.findMany({
        where: and(
          eq(messages.status, 'pending_approval'),
          eq(messages.direction, 'outbound'),
          isNull(messages.deletedAt),
        )!,
        orderBy: desc(messages.createdAt),
        limit: 500,
      })
      const leadIds = [...new Set(rows.map((r) => r.leadId).filter((x): x is string => !!x))]
      const leadRows = leadIds.length
        ? await ctx.db.leads.findMany({ where: inArray(leads.id, leadIds), limit: leadIds.length })
        : []
      const nameById = new Map(leadRows.map((l) => [l.id, l.companyName]))
      return rows.map((r) => toDraftMessageDTO(r, r.leadId ? (nameById.get(r.leadId) ?? 'Unknown') : 'Unknown'))
    })
  })
}

/** Approve a draft -> queued (held; sending stays OFF until domain auth verifies). */
export async function approveDraft(input: unknown): Promise<Result<{ id: string }>> {
  return withAction(async () => {
    const { id } = messageIdSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      const row = await ctx.db.messages.update(id, { status: 'queued' })
      if (!row) throw new NotFoundError('Draft not found.')
      return { id }
    })
  })
}

/** Reject a draft -> soft-deleted (removed from the queue). */
export async function rejectDraft(input: unknown): Promise<Result<{ id: string }>> {
  return withAction(async () => {
    const { id } = messageIdSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const row = await ctx.db.messages.update(id, { deletedAt: new Date() })
      if (!row) throw new NotFoundError('Draft not found.')
      return { id }
    })
  })
}

/** Edit a draft's subject/body; re-scores spam. Stays pending_approval. */
export async function editDraft(input: unknown): Promise<Result<DraftMessageDTO>> {
  return withAction(async () => {
    const { id, subject, bodyText } = editDraftSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const existing = await ctx.db.messages.findById(id)
      if (!existing) throw new NotFoundError('Draft not found.')
      const spam = scoreSpam(subject, bodyText)
      const row = await ctx.db.messages.update(id, {
        subject,
        bodyText,
        aiMeta: { ...existing.aiMeta, spamLevel: spam.level, spamScore: spam.score },
      })
      if (!row) throw new NotFoundError('Draft not found.')
      const lead = row.leadId ? await ctx.db.leads.findById(row.leadId) : null
      return toDraftMessageDTO(row, lead?.companyName ?? 'Unknown')
    })
  })
}

export async function bulkApproveDrafts(input: unknown): Promise<Result<{ approved: number }>> {
  return withAction(async () => {
    const { ids } = bulkApproveSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      let approved = 0
      for (const id of ids) {
        if (await ctx.db.messages.update(id, { status: 'queued' })) approved++
      }
      return { approved }
    })
  })
}
