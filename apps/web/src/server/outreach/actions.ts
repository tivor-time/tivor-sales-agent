'use server'

import { runInTenant, schema, getTenantProfile } from '@tradepilot/db'
import { and, eq, isNull, inArray, desc, sql } from 'drizzle-orm'
import { env } from '@tradepilot/shared/env'
import { DEFAULT_SEQUENCE_STEPS, scoreSpam, type DraftCatalogItem } from '@tradepilot/shared/outreach'
import type { Language } from '@tradepilot/shared'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, type Result } from '@/server/result'
import { sendEvent } from '@/lib/inngest/client'
import { generateColdEmail } from '@/lib/ai/draft'
import { toDraftMessageDTO, type DraftMessageDTO } from './dto'
import {
  generateDraftsSchema,
  editDraftSchema,
  messageIdSchema,
  bulkApproveSchema,
} from './schemas'

const { leads, contacts, catalogItems, messages, auditEvents } = schema

interface PendingDraft {
  leadId: string
  contactId: string | null
  toAddress: string | null
  language: Language
  stepOrder: number
  stepKind: string
  dayOffset: number
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
          dayOffset: step.dayOffset,
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

    // Autopilot (per-tenant): when ON, the intro email is queued to send now and
    // follow-ups are scheduled by cadence — no human approval. High-spam drafts are
    // never auto-sent; they fall back to the approval queue as a safety net.
    const autopilot = (data.profile.companyProfile as { autopilot?: boolean }).autopilot === true

    // Phase C — persist campaign + sequence + steps + messages (short tx).
    const result = await runInTenant(partial, async (ctx) => {
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
      const now = Date.now()
      const values = pending.map((p) => {
        const highSpam = p.aiMeta.spamLevel === 'high'
        const auto = autopilot && !highSpam
        const isIntro = p.dayOffset <= 0
        const status = auto ? (isIntro ? 'queued' : 'scheduled') : 'pending_approval'
        const scheduledAt = auto && !isIntro ? new Date(now + p.dayOffset * 86_400_000) : null
        return {
          campaignId: campaign.id,
          sequenceStepId: stepIdByOrder.get(p.stepOrder)!,
          leadId: p.leadId,
          contactId: p.contactId,
          direction: 'outbound',
          status,
          scheduledAt,
          language: p.language,
          toAddress: p.toAddress,
          subject: p.subject,
          bodyText: p.bodyText,
          aiMeta: { ...p.aiMeta, autopilot: auto },
        }
      })
      const inserted = await ctx.db.messages.insertMany(values as never)
      // Intro emails autopilot queued for immediate send (scheduled follow-ups are
      // picked up later by the scheduled-sends sweep in the worker).
      const queued = inserted.filter((m) => m.status === 'queued')
      return { campaignId: campaign.id, leads: data.leadRows.length, drafts: inserted.length, queued }
    })

    // Emit a send event per auto-queued intro, AFTER the tx commits.
    for (const row of result.queued) {
      if (row.sequenceStepId && row.leadId) {
        await sendEvent('sequence/step.due', {
          tenantId: partial.tenantId,
          actorUserId: partial.userId,
          messageId: row.id,
          sequenceStepId: row.sequenceStepId,
          leadId: row.leadId,
          contactId: row.contactId ?? undefined,
        })
      }
    }
    return { campaignId: result.campaignId, leads: result.leads, drafts: result.drafts }
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

/**
 * Approve a draft -> queued, then emit `sequence/step.due` so the worker picks it
 * up. The worker still holds it unless a verified mailbox exists (sending stays
 * OFF until domain auth verifies). The event is emitted AFTER the tx commits.
 */
export async function approveDraft(input: unknown): Promise<Result<{ id: string }>> {
  return withAction(async () => {
    const { id } = messageIdSchema.parse(input)
    const partial = await resolveTenantContext()
    const row = await runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      const updated = await ctx.db.messages.update(id, { status: 'queued' })
      if (!updated) throw new NotFoundError('Draft not found.')
      return updated
    })
    if (row.sequenceStepId && row.leadId) {
      await sendEvent('sequence/step.due', {
        tenantId: partial.tenantId,
        actorUserId: partial.userId,
        messageId: row.id,
        sequenceStepId: row.sequenceStepId,
        leadId: row.leadId,
        contactId: row.contactId ?? undefined,
      })
    }
    return { id }
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
    const rows = await runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'admin')
      const approved: Awaited<ReturnType<typeof ctx.db.messages.update>>[] = []
      for (const id of ids) {
        const row = await ctx.db.messages.update(id, { status: 'queued' })
        if (row) approved.push(row)
      }
      return approved
    })
    // Emit one send event per approved draft, AFTER the tx commits.
    for (const row of rows) {
      if (row && row.sequenceStepId && row.leadId) {
        await sendEvent('sequence/step.due', {
          tenantId: partial.tenantId,
          actorUserId: partial.userId,
          messageId: row.id,
          sequenceStepId: row.sequenceStepId,
          leadId: row.leadId,
          contactId: row.contactId ?? undefined,
        })
      }
    }
    return { approved: rows.length }
  })
}

export interface OutreachActivityItem {
  id: string
  occurredAt: string
  subject: string | null
  fromAddress: string | null
  toAddress: string | null
  status: string | null
  role: string | null
  folders: string[]
  source: 'app' | 'provider'
}

export interface OutreachActivityDTO {
  received: OutreachActivityItem[]
  sent: OutreachActivityItem[]
  moved: OutreachActivityItem[]
}

function toIso(input: unknown, fallback: Date): string {
  if (typeof input === 'string') {
    const d = new Date(input)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return fallback.toISOString()
}

function toStringOrNull(input: unknown): string | null {
  return typeof input === 'string' && input.trim().length > 0 ? input.trim() : null
}

export async function listOutreachActivity(): Promise<Result<OutreachActivityDTO>> {
  return withAction(async () => {
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')

      const [receivedRows, sentRows, movedRows] = await Promise.all([
        ctx.db.messages.findMany({
          where: and(eq(messages.direction, 'inbound'), isNull(messages.deletedAt))!,
          orderBy: desc(messages.receivedAt),
          limit: 80,
        }),
        ctx.db.messages.findMany({
          where: and(
            eq(messages.direction, 'outbound'),
            inArray(messages.status, ['sent', 'delivered', 'replied']),
            isNull(messages.deletedAt),
          )!,
          orderBy: desc(messages.sentAt),
          limit: 80,
        }),
        ctx.db.auditEvents.findMany({
          where: and(
            eq(auditEvents.entityType, 'unipile_mailing'),
            sql`${auditEvents.after} ->> 'event' = 'mail_moved'`,
          )!,
          orderBy: desc(auditEvents.createdAt),
          limit: 80,
        }),
      ])

      const received = receivedRows.map((row) => ({
        id: row.id,
        occurredAt: (row.receivedAt ?? row.createdAt).toISOString(),
        subject: row.subject ?? null,
        fromAddress: row.fromAddress ?? null,
        toAddress: row.toAddress ?? null,
        status: row.status ?? null,
        role: null,
        folders: [],
        source: 'provider' as const,
      }))

      const sent = sentRows.map((row) => ({
        id: row.id,
        occurredAt: (row.sentAt ?? row.createdAt).toISOString(),
        subject: row.subject ?? null,
        fromAddress: row.fromAddress ?? null,
        toAddress: row.toAddress ?? null,
        status: row.status ?? null,
        role: null,
        folders: [],
        source:
          (row.aiMeta as Record<string, unknown> | null | undefined)?.unipileSynced === true
            ? ('provider' as const)
            : ('app' as const),
      }))

      const moved = movedRows.map((row) => {
        const after = (row.after ?? {}) as Record<string, unknown>
        const folders = Array.isArray(after.folders)
          ? after.folders.map((x) => toStringOrNull(x)).filter((x): x is string => !!x)
          : []
        return {
          id: row.id,
          occurredAt: toIso(after.occurredAt, row.createdAt),
          subject: toStringOrNull(after.subject),
          fromAddress: toStringOrNull(after.fromAddress),
          toAddress: toStringOrNull(after.toAddress),
          status: 'moved',
          role: toStringOrNull(after.role),
          folders,
          source: 'provider' as const,
        }
      })

      return { received, sent, moved }
    })
  })
}
