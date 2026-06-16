/** Deliverability domain types (pure, framework-agnostic). */

export type MailProvider = 'gmail' | 'microsoft' | 'smtp' | 'resend'
export type DnsVerification = 'unknown' | 'pending' | 'pass' | 'fail'
export type WarmupState = 'not_started' | 'warming' | 'active' | 'paused' | 'throttled'

/** A DNS record the tenant must add to authenticate their sending domain. */
export interface DnsRecord {
  purpose: 'spf' | 'dkim' | 'dmarc'
  type: 'TXT' | 'CNAME'
  host: string // e.g. "@", "_dmarc", "google._domainkey", "selector1._domainkey"
  value: string
  note?: string
}

/** Result of resolving + checking the three domain-auth records. */
export interface DomainAuthResult {
  spf: DnsVerification
  dkim: DnsVerification
  dmarc: DnsVerification
  /** all three === 'pass' */
  verified: boolean
}
