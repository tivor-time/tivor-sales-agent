import { z } from 'zod'

export const catalogListSchema = z.object({
  search: z.string().trim().max(200).optional(),
  active: z.boolean().optional(),
})

export const upsertCatalogSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  grade: z.string().trim().max(80).optional().nullable(),
  packaging: z.string().trim().max(120).optional().nullable(),
  hsCode: z.string().trim().max(20).optional().nullable(),
  unit: z.string().trim().min(1).max(20).default('kg'),
  moq: z.string().trim().optional().nullable(),
  incoterms: z.array(z.string().trim()).default([]),
  certifications: z.array(z.string().trim()).default([]),
  priceList: z
    .object({
      currency: z.string().length(3),
      tiers: z.array(z.object({ minQty: z.number().nonnegative(), price: z.number().nonnegative() })),
    })
    .default({ currency: 'USD', tiers: [] }),
  active: z.boolean().default(true),
})
export type UpsertCatalogInput = z.input<typeof upsertCatalogSchema>
