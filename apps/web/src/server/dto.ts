import { schema } from '@tradepilot/db'
import type { Language } from '@tradepilot/shared'

type LeadRow = typeof schema.leads.$inferSelect
type ContactRow = typeof schema.contacts.$inferSelect
type ProvenanceRow = typeof schema.leadProvenance.$inferSelect
type CatalogRow = typeof schema.catalogItems.$inferSelect
type AuditRow = typeof schema.auditEvents.$inferSelect

export type LeadStage = LeadRow['stage']
export type LeadSource = LeadRow['source']

/** All Date fields are ISO strings so the payload is RSC/JSON serializable. */
export interface LeadDTO {
  id: string
  companyName: string
  domain: string | null
  website: string | null
  country: string | null
  region: string | null
  city: string | null
  language: Language
  industry: string | null
  stage: LeadStage
  source: LeadSource
  icpScore: number | null
  tags: string[]
  enrichment: Record<string, unknown>
  assignedUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface ContactDTO {
  id: string
  leadId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  title: string | null
  phone: string | null
  language: Language
  linkedinUrl: string | null
  isPrimary: boolean
  consent: { optedOut?: boolean; basis?: string; capturedAt?: string }
  createdAt: string
}

export interface ProvenanceDTO {
  id: string
  leadId: string
  source: LeadSource
  provider: string | null
  sourceUrl: string | null
  confidence: number | null
  rawPayload: Record<string, unknown>
  createdAt: string
}

export interface ActivityItem {
  id: string
  kind: 'provenance' | 'audit'
  action: string
  summary: string
  at: string
  meta?: Record<string, unknown>
}

export interface LeadDetailDTO {
  lead: LeadDTO
  contacts: ContactDTO[]
  provenance: ProvenanceDTO[]
  activity: ActivityItem[]
}

export interface CatalogItemDTO {
  id: string
  sku: string
  name: string
  description: string | null
  category: string | null
  grade: string | null
  packaging: string | null
  hsCode: string | null
  unit: string
  moq: string | null
  incoterms: string[]
  certifications: string[]
  localized: Record<string, { name?: string; description?: string }>
  priceList: { currency: string; tiers: { minQty: number; price: number }[] }
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Page<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

const iso = (d: Date) => d.toISOString()

export function toLeadDTO(r: LeadRow): LeadDTO {
  return {
    id: r.id,
    companyName: r.companyName,
    domain: r.domain,
    website: r.website,
    country: r.country,
    region: r.region,
    city: r.city,
    language: r.language,
    industry: r.industry,
    stage: r.stage,
    source: r.source,
    icpScore: r.icpScore,
    tags: r.tags ?? [],
    enrichment: r.enrichment ?? {},
    assignedUserId: r.assignedUserId,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  }
}

export function toContactDTO(r: ContactRow): ContactDTO {
  return {
    id: r.id,
    leadId: r.leadId,
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    title: r.title,
    phone: r.phone,
    language: r.language,
    linkedinUrl: r.linkedinUrl,
    isPrimary: r.isPrimary,
    consent: r.consent ?? {},
    createdAt: iso(r.createdAt),
  }
}

export function toProvenanceDTO(r: ProvenanceRow): ProvenanceDTO {
  return {
    id: r.id,
    leadId: r.leadId,
    source: r.source,
    provider: r.provider,
    sourceUrl: r.sourceUrl,
    confidence: r.confidence,
    rawPayload: r.rawPayload ?? {},
    createdAt: iso(r.createdAt),
  }
}

export function toCatalogDTO(r: CatalogRow): CatalogItemDTO {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    description: r.description,
    category: r.category,
    grade: r.grade,
    packaging: r.packaging,
    hsCode: r.hsCode,
    unit: r.unit,
    moq: r.moq,
    incoterms: r.incoterms ?? [],
    certifications: r.certifications ?? [],
    localized: r.localized ?? {},
    priceList: r.priceList ?? { currency: 'USD', tiers: [] },
    active: r.active,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  }
}

function summarizeAudit(a: AuditRow): string {
  switch (a.action) {
    case 'create':
      return 'Lead created'
    case 'update':
      return 'Lead updated'
    case 'import':
      return 'Imported from file'
    case 'delete':
      return 'Lead deleted'
    default:
      return a.action
  }
}

/** Merge provenance + audit rows into one descending activity feed. */
export function buildActivity(prov: ProvenanceRow[], audits: AuditRow[]): ActivityItem[] {
  const fromProv: ActivityItem[] = prov.map((p) => ({
    id: `prov_${p.id}`,
    kind: 'provenance',
    action: p.source,
    summary: `Discovered via ${p.provider ?? p.source}${
      p.confidence != null ? ` (confidence ${p.confidence})` : ''
    }`,
    at: iso(p.createdAt),
    meta: { sourceUrl: p.sourceUrl ?? undefined },
  }))
  const fromAudit: ActivityItem[] = audits.map((a) => ({
    id: `audit_${a.id}`,
    kind: 'audit',
    action: a.action,
    summary: summarizeAudit(a),
    at: iso(a.createdAt),
    meta: { actorType: a.actorType },
  }))
  return [...fromProv, ...fromAudit].sort((x, y) => (x.at < y.at ? 1 : -1))
}
