import { z } from 'zod'

export const LEAD_STAGES = [
  'new',
  'researching',
  'qualified',
  'contacted',
  'engaged',
  'negotiating',
  'won',
  'lost',
  'disqualified',
] as const
export const LEAD_SOURCES = [
  'manual',
  'csv_import',
  'ai_discovery',
  'enrichment',
  'inbound_reply',
  'referral',
  'marketplace',
] as const
export const LANGUAGES = ['en', 'de', 'es', 'fr', 'pl'] as const

export const leadStageSchema = z.enum(LEAD_STAGES)
export const leadSourceSchema = z.enum(LEAD_SOURCES)
const languageSchema = z.enum(LANGUAGES)
const countrySchema = z.string().trim().length(2).toUpperCase()

export const sortFieldSchema = z.enum([
  'companyName',
  'icpScore',
  'createdAt',
  'updatedAt',
  'stage',
  'country',
])
export const sortDirSchema = z.enum(['asc', 'desc'])

export const leadFiltersSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    stage: z.array(leadStageSchema).default([]),
    country: z.array(countrySchema).default([]),
    source: z.array(leadSourceSchema).default([]),
    tags: z.array(z.string().trim().min(1)).default([]),
    icpScoreMin: z.number().int().min(0).max(100).optional(),
    icpScoreMax: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (f) => f.icpScoreMin == null || f.icpScoreMax == null || f.icpScoreMin <= f.icpScoreMax,
    { message: 'icpScoreMin must be <= icpScoreMax', path: ['icpScoreMin'] },
  )

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
})

export const sortSchema = z.object({
  field: sortFieldSchema.default('createdAt'),
  dir: sortDirSchema.default('desc'),
})

export const listLeadsInputSchema = z.object({
  filters: leadFiltersSchema.default({}),
  pagination: paginationSchema.default({}),
  sort: sortSchema.default({}),
})
export type LeadFilters = z.infer<typeof leadFiltersSchema>
export type ListLeadsInput = z.infer<typeof listLeadsInputSchema>
export type SortInput = z.infer<typeof sortSchema>

export const idSchema = z.string().uuid()

export const createLeadSchema = z.object({
  companyName: z.string().trim().min(1).max(300),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Invalid domain')
    .optional()
    .nullable(),
  website: z.string().trim().url().max(500).optional().nullable(),
  country: countrySchema.optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  language: languageSchema.default('en'),
  industry: z.string().trim().max(120).optional().nullable(),
  stage: leadStageSchema.default('new'),
  source: leadSourceSchema.default('manual'),
  icpScore: z.number().int().min(0).max(100).optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(50).default([]),
})
export type CreateLeadInput = z.infer<typeof createLeadSchema>

export const updateLeadSchema = createLeadSchema.partial().extend({ id: idSchema })
export const updateLeadStageSchema = z.object({ id: idSchema, stage: leadStageSchema })

export const bulkTagSchema = z
  .object({
    ids: z.array(idSchema).min(1).max(500),
    add: z.array(z.string().trim().min(1)).default([]),
    remove: z.array(z.string().trim().min(1)).default([]),
  })
  .refine((v) => v.add.length + v.remove.length > 0, {
    message: 'Provide tags to add or remove',
  })
export const bulkStageSchema = z.object({ ids: z.array(idSchema).min(1).max(500), stage: leadStageSchema })
export const bulkDeleteSchema = z.object({ ids: z.array(idSchema).min(1).max(500) })
