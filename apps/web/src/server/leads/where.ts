import { and, or, ilike, inArray, gte, lte, isNull, asc, desc, sql, type SQL } from 'drizzle-orm'
import { schema } from '@tradepilot/db'
import type { LeadFilters, SortInput } from './schemas'

const { leads } = schema

/** Escape LIKE wildcards so user input can't widen the match. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Translate validated LeadFilters into a single SQL predicate. ALWAYS ANDs
 * isNull(leads.deletedAt) because the ScopedRepository does NOT auto-filter
 * soft-deletes. tenant_id is added by the DAL on top of this.
 */
export function buildLeadsWhere(f: LeadFilters): SQL {
  const clauses: SQL[] = [isNull(leads.deletedAt)]

  if (f.search) {
    const term = `%${escapeLike(f.search)}%`
    const searchClause = or(ilike(leads.companyName, term), ilike(leads.domain, term))
    if (searchClause) clauses.push(searchClause)
  }
  if (f.stage.length) clauses.push(inArray(leads.stage, f.stage))
  if (f.country.length) clauses.push(inArray(leads.country, f.country))
  if (f.source.length) clauses.push(inArray(leads.source, f.source))
  if (f.icpScoreMin != null) clauses.push(gte(leads.icpScore, f.icpScoreMin))
  if (f.icpScoreMax != null) clauses.push(lte(leads.icpScore, f.icpScoreMax))

  // tags is jsonb string[]; "lead has ANY of the selected tags" via containment.
  if (f.tags.length) {
    const tagClauses = f.tags.map((t) => sql`${leads.tags} @> ${JSON.stringify([t])}::jsonb`)
    const tagsOr = tagClauses.length === 1 ? tagClauses[0] : or(...tagClauses)
    if (tagsOr) clauses.push(tagsOr)
  }

  return and(...clauses) as SQL
}

const SORT_COLUMNS = {
  companyName: leads.companyName,
  icpScore: leads.icpScore,
  createdAt: leads.createdAt,
  updatedAt: leads.updatedAt,
  stage: leads.stage,
  country: leads.country,
} as const

/** Stable sort: primary column + id tiebreaker so offset pagination is deterministic. */
export function buildLeadsOrderBy(sort: SortInput): SQL {
  const col = SORT_COLUMNS[sort.field]
  const dirFn = sort.dir === 'asc' ? asc : desc
  return sql`${dirFn(col)} NULLS LAST, ${leads.id} ASC` as SQL
}
