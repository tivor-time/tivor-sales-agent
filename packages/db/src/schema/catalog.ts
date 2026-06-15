import { pgTable, text, numeric, jsonb, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { id, timestamps, softDelete, tenantId } from './_shared'

/** Products the tenant sells (e.g. Grade 40/60 gherkins in brine/vinegar). */
export const catalogItems = pgTable(
  'catalog_items',
  {
    id: id(),
    tenantId: tenantId(),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    grade: text('grade'),
    packaging: text('packaging'),
    hsCode: text('hs_code'),
    unit: text('unit').notNull().default('kg'),
    moq: numeric('moq', { precision: 12, scale: 2 }),
    incoterms: jsonb('incoterms').$type<string[]>().notNull().default([]),
    certifications: jsonb('certifications').$type<string[]>().notNull().default([]),
    localized: jsonb('localized')
      .$type<Record<string, { name?: string; description?: string }>>()
      .notNull()
      .default({}),
    priceList: jsonb('price_list')
      .$type<{ currency: string; tiers: { minQty: number; price: number }[] }>()
      .notNull()
      .default({ currency: 'USD', tiers: [] }),
    active: boolean('active').notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (t) => ({
    tenantSkuUx: uniqueIndex('catalog_items_tenant_sku_ux').on(t.tenantId, t.sku),
    tenantActiveIdx: index('catalog_items_tenant_active_idx').on(t.tenantId, t.active),
  }),
)
