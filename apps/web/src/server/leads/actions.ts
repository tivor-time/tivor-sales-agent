'use server'

import { runInTenant, schema } from '@tradepilot/db'
import { and, eq, inArray, isNull, desc } from 'drizzle-orm'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, type Result } from '../result'
import {
  toLeadDTO,
  toContactDTO,
  toProvenanceDTO,
  buildActivity,
  type LeadDTO,
  type LeadDetailDTO,
  type Page,
} from '../dto'
import {
  listLeadsInputSchema,
  createLeadSchema,
  updateLeadSchema,
  updateLeadStageSchema,
  bulkTagSchema,
  bulkStageSchema,
  bulkDeleteSchema,
  idSchema,
  type ListLeadsInput,
  type CreateLeadInput,
} from './schemas'
import { buildLeadsWhere, buildLeadsOrderBy } from './where'

const { leads, contacts, leadProvenance, auditEvents } = schema

/** Filter + sort + paginate + count, all in one tenant transaction. */
export async function listLeads(input: ListLeadsInput): Promise<Result<Page<LeadDTO>>> {
  return withAction(async () => {
    const { filters, pagination, sort } = listLeadsInputSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      const where = buildLeadsWhere(filters)
      const orderBy = buildLeadsOrderBy(sort)
      const offset = (pagination.page - 1) * pagination.pageSize
      const [total, rows] = await Promise.all([
        ctx.db.leads.count(where),
        ctx.db.leads.findMany({ where, orderBy, limit: pagination.pageSize, offset }),
      ])
      return {
        rows: rows.map(toLeadDTO),
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
      }
    })
  })
}

/** Lead + contacts + provenance + merged activity timeline. */
export async function getLead(id: string): Promise<Result<LeadDetailDTO>> {
  return withAction(async () => {
    const leadId = idSchema.parse(id)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      const lead = await ctx.db.leads.findFirst(and(eq(leads.id, leadId), isNull(leads.deletedAt))!)
      if (!lead) throw new NotFoundError('Lead not found')
      const [contactRows, provRows, auditRows] = await Promise.all([
        ctx.db.contacts.findMany({
          where: and(eq(contacts.leadId, leadId), isNull(contacts.deletedAt))!,
          orderBy: desc(contacts.isPrimary),
          limit: 200,
        }),
        ctx.db.leadProvenance.findMany({
          where: eq(leadProvenance.leadId, leadId),
          orderBy: desc(leadProvenance.createdAt),
          limit: 200,
        }),
        ctx.db.auditEvents.findMany({
          where: and(eq(auditEvents.entityType, 'leads'), eq(auditEvents.entityId, leadId))!,
          orderBy: desc(auditEvents.createdAt),
          limit: 100,
        }),
      ])
      return {
        lead: toLeadDTO(lead),
        contacts: contactRows.map(toContactDTO),
        provenance: provRows.map(toProvenanceDTO),
        activity: buildActivity(provRows, auditRows),
      }
    })
  })
}

export async function updateLeadStage(input: {
  id: string
  stage: string
}): Promise<Result<LeadDTO>> {
  return withAction(async () => {
    const { id, stage } = updateLeadStageSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      const row = await ctx.db.leads.update(id, { stage })
      if (!row) throw new NotFoundError('Lead not found')
      return toLeadDTO(row)
    })
  })
}

export async function createLead(input: CreateLeadInput): Promise<Result<LeadDTO>> {
  return withAction(async () => {
    const v = createLeadSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      const row = await ctx.db.leads.insert(v as never)
      return toLeadDTO(row)
    })
  })
}

export async function updateLead(
  input: { id: string } & Partial<CreateLeadInput>,
): Promise<Result<LeadDTO>> {
  return withAction(async () => {
    const { id, ...patch } = updateLeadSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      const row = await ctx.db.leads.update(id, patch as never)
      if (!row) throw new NotFoundError('Lead not found')
      return toLeadDTO(row)
    })
  })
}

export async function bulkTagLeads(input: {
  ids: string[]
  add?: string[]
  remove?: string[]
}): Promise<Result<{ updated: number }>> {
  return withAction(async () => {
    const { ids, add, remove } = bulkTagSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      const rows = await ctx.db.leads.findMany({
        where: and(inArray(leads.id, ids), isNull(leads.deletedAt))!,
        limit: ids.length,
      })
      let updated = 0
      for (const r of rows) {
        const next = new Set(r.tags ?? [])
        for (const t of add) next.add(t)
        for (const t of remove) next.delete(t)
        await ctx.db.leads.update(r.id, { tags: [...next] })
        updated++
      }
      return { updated }
    })
  })
}

export async function bulkSetStage(input: {
  ids: string[]
  stage: string
}): Promise<Result<{ updated: number }>> {
  return withAction(async () => {
    const { ids, stage } = bulkStageSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      let updated = 0
      for (const id of ids) {
        if (await ctx.db.leads.update(id, { stage })) updated++
      }
      return { updated }
    })
  })
}

/** Soft delete (sets deletedAt); requires admin. */
export async function bulkDeleteLeads(input: { ids: string[] }): Promise<Result<{ deleted: number }>> {
  return withAction(async () => {
    const { ids } = bulkDeleteSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'admin')
      const now = new Date()
      let deleted = 0
      for (const id of ids) {
        if (await ctx.db.leads.update(id, { deletedAt: now })) deleted++
      }
      return { deleted }
    })
  })
}
