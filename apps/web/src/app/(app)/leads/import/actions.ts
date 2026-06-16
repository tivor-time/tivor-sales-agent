'use server'

import { parseSheet, autoDetectMapping, type ColumnMapping, type ImportReport } from '@tradepilot/shared/import'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { withAction, type Result } from '@/server/result'
import { runImport } from '@/lib/import/run-import'
import { previewImportSchema, commitImportSchema } from './schema'

function decode(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

export interface ImportPreview {
  headers: string[]
  sample: string[][]
  suggestedMapping: ColumnMapping
  rowCount: number
  truncated: boolean
}

/** Parse the uploaded file and propose a column mapping. No DB needed. */
export async function previewImport(input: unknown): Promise<Result<ImportPreview>> {
  return withAction(async () => {
    const { kind, base64 } = previewImportSchema.parse(input)
    const sheet = parseSheet({ kind, data: decode(base64) })
    return {
      headers: sheet.headers,
      sample: sheet.rows.slice(0, 5),
      suggestedMapping: autoDetectMapping(sheet),
      rowCount: sheet.meta.rowCount,
      truncated: sheet.meta.truncated,
    }
  })
}

/** Parse + run the full import pipeline (dedupe + ICP + persist) in one transaction. */
export async function commitImport(input: unknown): Promise<Result<{ report: ImportReport }>> {
  return withAction(async () => {
    const { kind, base64, mapping, fileName } = commitImportSchema.parse(input)
    const sheet = parseSheet({ kind, data: decode(base64) })
    const partial = await resolveTenantContext()
    const report = await runImport(partial, { sheet, mapping: mapping as ColumnMapping, fileName })
    return { report }
  })
}
