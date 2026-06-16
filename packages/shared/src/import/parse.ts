import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { type RawSheet, type ParseInput, MAX_IMPORT_ROWS } from './types'

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

function normalizeRowLen(r: string[], n: number): string[] {
  const out = r.slice(0, n)
  while (out.length < n) out.push('')
  return out
}

/** Parse CSV (BOM/encoding/auto-delimiter/quoted-field safe) into a string matrix. */
export function parseCsv(data: ArrayBuffer | Uint8Array | string): RawSheet {
  const text =
    typeof data === 'string' ? stripBom(data) : stripBom(new TextDecoder('utf-8').decode(data))
  const out = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
    delimiter: '', // auto-detect among , ; \t |
    dynamicTyping: false,
  })
  const all = out.data.filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ''))
  const headers = (all[0] ?? []).map((h) => String(h ?? '').trim())
  const body = all.slice(1)
  const truncated = body.length > MAX_IMPORT_ROWS
  const rows = body
    .slice(0, MAX_IMPORT_ROWS)
    .map((r) => normalizeRowLen(r.map((c) => String(c ?? '').trim()), headers.length))
  return {
    headers,
    rows,
    meta: { rowCount: rows.length, truncated, delimiter: out.meta.delimiter, encoding: 'utf-8' },
  }
}

/** Parse XLSX (first non-empty sheet) into a string matrix. */
export function parseXlsx(data: ArrayBuffer | Uint8Array): RawSheet {
  const wb = XLSX.read(data, { type: 'array', dense: true, cellDates: false })
  const sheetName =
    wb.SheetNames.find((n) => wb.Sheets[n] && wb.Sheets[n]['!ref']) ?? wb.SheetNames[0] ?? ''
  const ws = wb.Sheets[sheetName]
  const matrix = ws
    ? XLSX.utils.sheet_to_json<string[]>(ws, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: false,
      })
    : []
  const headers = (matrix[0] ?? []).map((h) => String(h ?? '').trim())
  const body = matrix.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''))
  const truncated = body.length > MAX_IMPORT_ROWS
  const rows = body
    .slice(0, MAX_IMPORT_ROWS)
    .map((r) => normalizeRowLen(r.map((c) => String(c ?? '').trim()), headers.length))
  return { headers, rows, meta: { rowCount: rows.length, truncated } }
}

export function parseSheet(input: ParseInput): RawSheet {
  return input.kind === 'csv' ? parseCsv(input.data) : parseXlsx(input.data)
}
