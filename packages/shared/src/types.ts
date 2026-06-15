/** Shared domain types used across web, worker, and db (framework-agnostic). */
import type { Language } from './constants'

/** A raw lead row as produced by a LeadSourceProvider or a CSV import, before
 * dedupe/enrichment/persistence. Intentionally loose — providers vary. */
export interface RawLead {
  companyName: string
  domain?: string
  website?: string
  country?: string
  region?: string
  city?: string
  language?: Language
  industry?: string
  hsCode?: string
  /** Free-form provider payload kept for provenance. */
  raw?: Record<string, unknown>
  contacts?: RawContact[]
}

export interface RawContact {
  email?: string
  firstName?: string
  lastName?: string
  title?: string
  phone?: string
  linkedinUrl?: string
}

/** Result of an ICP scoring pass. */
export interface IcpScore {
  score: number // 0–100
  reasons: string[]
}

/** A citation attached to a market-intelligence brief. */
export interface Citation {
  title?: string
  url?: string
  snippet?: string
}

/** Generated marketplace listing content (channel-agnostic). */
export interface ListingContent {
  title?: string
  description?: string
  keywords?: string[]
  attributes?: Record<string, unknown>
  media?: string[]
}
