'use server'

import { runInTenant, schema } from '@tradepilot/db'
import { and, isNull, inArray, asc } from 'drizzle-orm'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, type Result } from '@/server/result'
import { toFollowUpDTO, type FollowUpDTO } from './dto'
import { listFollowUpsSchema, createFollowUpSchema, updateFollowUpSchema } from './schemas'

const { followUpTasks, leads } = schema

export async function listFollowUps(input: unknown): Promise<Result<FollowUpDTO[]>> {
  return withAction(async () => {
    const { status } = listFollowUpsSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const conds = [isNull(followUpTasks.deletedAt)]
      if (status.length) conds.push(inArray(followUpTasks.status, status))
      const rows = await ctx.db.followUpTasks.findMany({
        where: and(...conds)!,
        orderBy: asc(followUpTasks.dueDate),
        limit: 200,
      })
      const leadIds = rows.map((r) => r.leadId).filter((x): x is string => !!x)
      const leadRows = leadIds.length
        ? await ctx.db.leads.findMany({ where: inArray(leads.id, leadIds), limit: leadIds.length })
        : []
      const companyById = new Map(leadRows.map((l) => [l.id, l.companyName]))
      return rows.map((r) => toFollowUpDTO(r, r.leadId ? (companyById.get(r.leadId) ?? null) : null))
    })
  })
}

export async function createFollowUp(input: unknown): Promise<Result<{ id: string }>> {
  return withAction(async () => {
    const v = createFollowUpSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const row = await ctx.db.followUpTasks.insert({
        title: v.title,
        description: v.description ?? null,
        dueDate: v.dueDate ?? null,
        cadence: v.cadence,
        leadId: v.leadId ?? null,
        contactId: v.contactId ?? null,
        status: 'open',
      } as never)
      return { id: row.id }
    })
  })
}

export async function updateFollowUp(input: unknown): Promise<Result<{ id: string }>> {
  return withAction(async () => {
    const v = updateFollowUpSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const patch: Record<string, unknown> = {}
      if (v.status !== undefined) patch.status = v.status
      if (v.dueDate !== undefined) patch.dueDate = v.dueDate
      if (v.title !== undefined) patch.title = v.title
      if (v.description !== undefined) patch.description = v.description
      const row = await ctx.db.followUpTasks.update(v.id, patch as never)
      if (!row) throw new NotFoundError('Follow-up task not found.')
      return { id: v.id }
    })
  })
}
