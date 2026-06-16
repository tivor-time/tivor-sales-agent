/**
 * @tradepilot/shared/import — pure, framework-agnostic CSV/XLSX lead-import
 * pipeline (parse -> map -> normalize -> dedupe -> score). Server-leaning
 * (papaparse/xlsx), so it is a subpath export, not in the isomorphic barrel.
 */
export * from './types'
export { parseCsv, parseXlsx, parseSheet } from './parse'
export { autoDetectMapping, applyMapping } from './mapping'
export {
  normalizeCompanyName,
  extractApexDomain,
  normalizeCountry,
  normalizeEmail,
  normalizePhone,
  normalizeLanguage,
} from './normalize'
export {
  jaroWinkler,
  nameMatchScore,
  DEDUPE_MERGE_THRESHOLD,
  DEDUPE_REVIEW_THRESHOLD,
} from './similarity'
export { planDedupe } from './dedupe'
export {
  scoreIcp,
  buildScoringCatalog,
  type ScoringCatalog,
  type ScoringContext,
  type ScorableLead,
} from './score'
