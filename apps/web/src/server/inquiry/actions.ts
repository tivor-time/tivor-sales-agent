'use server'

import { runInTenant, schema } from '@tradepilot/db'
import { and, eq, isNull, inArray, desc } from 'drizzle-orm'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, type Result } from '@/server/result'
import {
  toInquiryListDTO,
  toInquiryDetailDTO,
  type InquiryListDTO,
  type InquiryDetailDTO,
} from './dto'
import { listInquiriesSchema, inquiryIdSchema, setInquiryStatusSchema } from './schemas'

const { inquiries, messages, leads } = schema

export interface InquiriesPage {
  rows: InquiryListDTO[]
  total: number
  page: number
  pageCount: number
}

export async function listInquiries(input: unknown): Promise<Result<InquiriesPage>> {
  return withAction(async () => {
    const { filters, pagination } = listInquiriesSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const conds = [isNull(inquiries.deletedAt)]
      if (filters.intent.length) conds.push(inArray(inquiries.intent, filters.intent))
      if (filters.status.length) conds.push(inArray(inquiries.status, filters.status))
      const where = and(...conds)!

      const total = await ctx.db.inquiries.count(where)
      const rows = await ctx.db.inquiries.findMany({
        where,
        orderBy: desc(inquiries.createdAt),
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
      })

      const msgIds = rows.map((r) => r.messageId).filter((x): x is string => !!x)
      const leadIds = rows.map((r) => r.leadId).filter((x): x is string => !!x)
      const msgs = msgIds.length
        ? await ctx.db.messages.findMany({ where: inArray(messages.id, msgIds), limit: msgIds.length })
        : []
      const leadRows = leadIds.length
        ? await ctx.db.leads.findMany({ where: inArray(leads.id, leadIds), limit: leadIds.length })
        : []
      const msgById = new Map(msgs.map((m) => [m.id, m]))
      const companyById = new Map(leadRows.map((l) => [l.id, l.companyName]))

      return {
        rows: rows.map((r) =>
          toInquiryListDTO(
            r,
            r.messageId ? (msgById.get(r.messageId) ?? null) : null,
            r.leadId ? (companyById.get(r.leadId) ?? null) : null,
          ),
        ),
        total,
        page: pagination.page,
        pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
      }
    })
  })
}

export async function getInquiry(input: unknown): Promise<Result<InquiryDetailDTO>> {
  return withAction(async () => {
    const { id } = inquiryIdSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const row = await ctx.db.inquiries.findFirst(and(eq(inquiries.id, id), isNull(inquiries.deletedAt))!)
      if (!row) throw new NotFoundError('Inquiry not found.')
      const message = row.messageId ? await ctx.db.messages.findById(row.messageId) : null
      const lead = row.leadId ? await ctx.db.leads.findById(row.leadId) : null
      return toInquiryDetailDTO(row, message, lead ? { id: lead.id, companyName: lead.companyName } : null)
    })
  })
}

export async function setInquiryStatus(input: unknown): Promise<Result<{ id: string }>> {
  return withAction(async () => {
    const { id, status } = setInquiryStatusSchema.parse(input)
    const partial = await resolveTenantContext()
    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')
      const row = await ctx.db.inquiries.update(id, { status })
      if (!row) throw new NotFoundError('Inquiry not found.')
      return { id }
    })
  })
}
