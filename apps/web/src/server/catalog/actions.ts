'use server'

import { runInTenant, schema } from '@tradepilot/db'
import { and, eq, ilike, isNull, asc } from 'drizzle-orm'
import { z } from 'zod'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, NotFoundError, type Result } from '../result'
import { toCatalogDTO, type CatalogItemDTO } from '../dto'
import { catalogListSchema, upsertCatalogSchema, type UpsertCatalogInput } from './schemas'

const { catalogItems } = schema

export async function listCatalogItems(
  input: z.input<typeof catalogListSchema> = {},
): Promise<Result<CatalogItemDTO[]>> {
  return withAction(async () => {
    const f = catalogListSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      const clauses = [isNull(catalogItems.deletedAt)]
      if (f.active != null) clauses.push(eq(catalogItems.active, f.active))
      if (f.search) clauses.push(ilike(catalogItems.name, `%${f.search}%`))
      const rows = await ctx.db.catalogItems.findMany({
        where: and(...clauses)!,
        orderBy: asc(catalogItems.name),
        limit: 500,
      })
      return rows.map(toCatalogDTO)
    })
  })
}

export async function upsertCatalogItem(input: UpsertCatalogInput): Promise<Result<CatalogItemDTO>> {
  return withAction(async () => {
    const v = upsertCatalogSchema.parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'member')
      const { id, ...values } = v
      const row = id
        ? await ctx.db.catalogItems.update(id, values as never)
        : await ctx.db.catalogItems.insert(values as never)
      if (!row) throw new NotFoundError('Catalog item not found')
      return toCatalogDTO(row)
    })
  })
}

export async function deleteCatalogItem(input: { id: string }): Promise<Result<{ deleted: boolean }>> {
  return withAction(async () => {
    const { id } = z.object({ id: z.string().uuid() }).parse(input)
    return runInTenant(await resolveTenantContext(), async (ctx) => {
      requireRole(ctx, 'admin')
      const row = await ctx.db.catalogItems.update(id, { deletedAt: new Date() })
      return { deleted: !!row }
    })
  })
}
