/**
 * No-op provider implementations used when a real provider is unconfigured.
 * They never throw — they return empty results so callers degrade gracefully
 * (e.g. lead sourcing falls back to CSV import, enrichment is skipped).
 */
import type {
  LeadSourceProvider,
  EnrichmentProvider,
  TradeIntelProvider,
} from './types'

export const noopLeadSource: LeadSourceProvider = {
  id: 'noop',
  isConfigured: false,
  async search() {
    return []
  },
}

export const noopEnrichment: EnrichmentProvider = {
  id: 'noop',
  isConfigured: false,
  async enrichCompany() {
    return {}
  },
  async enrichContacts() {
    return []
  },
}

export const noopTradeIntel: TradeIntelProvider = {
  id: 'noop',
  isConfigured: false,
  async fetchBrief() {
    return {
      summary: 'Market-intelligence provider not configured.',
      sections: {},
      citations: [],
    }
  },
}
