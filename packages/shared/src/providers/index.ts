/**
 * Provider registry. Resolves the active provider for each capability based on
 * feature flags, falling back to the no-op implementation when unconfigured.
 * Real adapters get registered here in later phases.
 *
 * SERVER-ONLY (reads flags from env).
 */
import { flags } from '../env'
import type {
  LeadSourceProvider,
  EnrichmentProvider,
  TradeIntelProvider,
} from './types'
import { noopLeadSource, noopEnrichment, noopTradeIntel } from './noop'

export * from './types'
export { noopLeadSource, noopEnrichment, noopTradeIntel } from './noop'

/** Trade-data lead sourcing (F1). CSV import is always available regardless. */
export function getLeadSourceProvider(): LeadSourceProvider {
  if (!flags.isTradeDataEnabled) return noopLeadSource
  // TODO(P8): return the configured Volza/ImportGenius/ImportKey/Tendata adapter.
  return noopLeadSource
}

/** Contact/company enrichment (F1). */
export function getEnrichmentProvider(): EnrichmentProvider {
  if (!flags.isEnrichmentEnabled) return noopEnrichment
  // TODO(P8): return the configured Apollo/Hunter adapter.
  return noopEnrichment
}

/** Market-intelligence source (F5). */
export function getTradeIntelProvider(): TradeIntelProvider {
  if (!flags.isTradeDataEnabled) return noopTradeIntel
  // TODO(P7/P8): return the configured trade-intel adapter.
  return noopTradeIntel
}
