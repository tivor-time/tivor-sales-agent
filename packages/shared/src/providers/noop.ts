/**
 * No-op provider implementations used when a real provider is unconfigured.
 * They never throw — they return empty results so callers degrade gracefully
 * (e.g. lead sourcing falls back to CSV import, enrichment is skipped).
 */
import type {
  LeadSourceProvider,
  EnrichmentProvider,
  TradeIntelProvider,
  MailboxProvider,
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

/**
 * Returned when a mailbox provider's keys are absent. getAuthUrl yields '' (never
 * throws); exchangeCode/send reject — but callers always gate on the provider
 * flag / isConfigured before invoking them, so a zero-secret boot never hits the
 * reject path.
 */
export const noopMailbox: MailboxProvider = {
  id: 'noop',
  isConfigured: false,
  getAuthUrl() {
    return ''
  },
  async exchangeCode() {
    throw new Error('Mailbox provider not configured.')
  },
  async send() {
    throw new Error('Mailbox provider not configured.')
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
