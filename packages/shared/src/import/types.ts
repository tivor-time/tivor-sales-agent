/** Shared, framework-agnostic types for the CSV/XLSX lead import pipeline. */

export type RawSheet = {
  /** original header cells, in column order (may be messy / blank / duplicated) */
  headers: string[]
  /** each row aligned to headers.length; cells are trimmed strings */
  rows: string[][]
  meta: { rowCount: number; truncated: boolean; encoding?: string; delimiter?: string }
}

export const MAX_IMPORT_ROWS = 50_000

export type ParseInput =
  | { kind: 'csv'; data: ArrayBuffer | Uint8Array | string }
  | { kind: 'xlsx'; data: ArrayBuffer | Uint8Array }

/** Fields a spreadsheet column can map to (lead + embedded primary contact). */
export const IMPORT_FIELDS = [
  'companyName',
  'website',
  'domain',
  'country',
  'region',
  'city',
  'industry',
  'language',
  'tags',
  'contactEmail',
  'contactFirstName',
  'contactLastName',
  'contactTitle',
  'contactPhone',
  'contactLinkedinUrl',
] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]

/** field -> column index into RawSheet.headers (absent = unmapped). */
export type ColumnMapping = Partial<Record<ImportField, number>>

export interface MappedRow {
  rowIndex: number
  lead: {
    companyName: string
    website?: string
    domain?: string
    country?: string
    region?: string
    city?: string
    industry?: string
    language?: string
    tags?: string[]
  }
  contact?: {
    email?: string
    firstName?: string
    lastName?: string
    title?: string
    phone?: string
    linkedinUrl?: string
  }
  /** full original row keyed by original header -> provenance.rawPayload */
  raw: Record<string, string>
}

export type DedupeAction = 'create' | 'merge' | 'skip'

export interface ExistingLeadKey {
  id: string
  domain: string | null
  nameNorm: string
  country: string | null
}

export interface DedupeDecision {
  rowIndex: number
  action: DedupeAction
  matchedLeadId?: string
  matchedBy?: 'domain' | 'name'
  score?: number
  /** in the review band [0.82, 0.90) -> created but flagged, never silently merged */
  review?: boolean
}

export interface ImportReport {
  fileName: string
  totalRows: number
  parsed: number
  created: number
  merged: number
  skipped: number
  invalid: number
  reviewFlagged: number
  contactsCreated: number
  durationMs: number
  errors: { rowIndex: number; message: string }[]
}
