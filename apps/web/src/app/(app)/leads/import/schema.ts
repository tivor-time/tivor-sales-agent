import { z } from 'zod'

export const importKindSchema = z.enum(['csv', 'xlsx'])

/** ColumnMapping: import-field -> column index. */
export const columnMappingSchema = z.record(z.number().int().min(0))

export const previewImportSchema = z.object({
  fileName: z.string().min(1).max(300),
  kind: importKindSchema,
  base64: z.string().min(1).max(25_000_000), // ~18MB binary
})

export const commitImportSchema = previewImportSchema.extend({
  mapping: columnMappingSchema,
})

export type PreviewImportInput = z.infer<typeof previewImportSchema>
export type CommitImportInput = z.infer<typeof commitImportSchema>
