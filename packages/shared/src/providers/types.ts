/**
 * Provider-adapter interfaces (§5). Each external integration is swappable with
 * a no-op / CSV fallback so the app degrades gracefully when a provider is
 * unconfigured. Real adapters land in later phases (F1 trade-data in P8, mailbox
 * OAuth in P3, etc.); the interfaces are stable from Phase 0.
 */
import type { RawLead, RawContact, Citation, ListingContent } from '../types'
import type { Marketplace } from '../constants'

export interface ProviderInfo {
  /** stable id, e.g. "volza", "apollo", "gmail" */
  readonly id: string
  /** whether the provider has the config/keys it needs to operate */
  readonly isConfigured: boolean
}

/** F1 — pull importer companies from trade-data providers (or CSV fallback). */
export interface LeadSourceProvider extends ProviderInfo {
  search(params: {
    hsCodes?: string[]
    keywords?: string[]
    destinationMarkets?: string[]
    limit?: number
  }): Promise<RawLead[]>
}

/** F1 — enrich companies/contacts with decision-maker details. */
export interface EnrichmentProvider extends ProviderInfo {
  enrichCompany(input: { domain?: string; companyName: string }): Promise<Partial<RawLead>>
  enrichContacts(input: { domain?: string; companyName: string }): Promise<RawContact[]>
}

/** F2/F3 — connected sending + receiving mailbox (Gmail / Microsoft Graph). */
export interface MailboxProvider extends ProviderInfo {
  /** Build the provider authorize URL. `codeChallenge` is the PKCE S256 challenge. */
  getAuthUrl(state: string, codeChallenge: string): string
  /** Exchange an authorization code (+ PKCE verifier) for tokens + the mailbox email. */
  exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
    email: string
    scopes: string[]
  }>
  /** Renew an access token from a refresh token (providers may rotate the refresh token). */
  refresh?(refreshToken: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
  }>
  send(input: {
    accessToken: string
    from: string
    to: string
    subject: string
    text: string
    html?: string
    inReplyTo?: string
    references?: string[]
  }): Promise<{ providerMessageId: string; threadId?: string }>
  /** Fetch new inbound messages incrementally (cursor stored in providerState). */
  receive?(input: {
    accessToken: string
    providerState: Record<string, unknown>
    maxMessages?: number
  }): Promise<ReceiveResult>
}

/** A normalized inbound email returned by MailboxProvider.receive(). */
export interface InboundMessage {
  providerMessageId: string
  internetMessageId?: string
  threadId?: string
  from: string
  to: string[]
  subject: string
  text: string
  html?: string
  receivedAt: Date
  inReplyTo?: string
  references: string[]
}

export interface ReceiveResult {
  messages: InboundMessage[]
  /** The advanced incremental cursor to persist on the EmailIdentity. */
  providerState: Record<string, unknown>
}

/** F4 — post listings where an official API exists; otherwise export-only. */
export interface MarketplaceProvider extends ProviderInfo {
  readonly marketplace: Marketplace
  readonly supportsPosting: boolean
  publish?(content: ListingContent): Promise<{ externalListingId: string; externalUrl?: string }>
}

/** F5 — market-intelligence sources (trends, shipments, tariffs). */
export interface TradeIntelProvider extends ProviderInfo {
  fetchBrief(input: { markets: string[]; hsCodes?: string[] }): Promise<{
    summary: string
    sections: Record<string, unknown>
    citations: Citation[]
  }>
}
