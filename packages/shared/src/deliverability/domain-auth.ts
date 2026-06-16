import type { DnsRecord, DnsVerification, DomainAuthResult, MailProvider } from './types'

/** The SPF `include:` mechanism each provider requires. */
const SPF_INCLUDE: Partial<Record<MailProvider, string>> = {
  gmail: 'include:_spf.google.com',
  microsoft: 'include:spf.protection.outlook.com',
}

/**
 * The DNS records a tenant must add to authenticate their sending domain for a
 * provider. DKIM values are provider-generated (we show guidance + verify presence).
 */
export function expectedDnsRecords(provider: MailProvider, domain: string): DnsRecord[] {
  const records: DnsRecord[] = []
  const include = SPF_INCLUDE[provider]

  if (include) {
    records.push({
      purpose: 'spf',
      type: 'TXT',
      host: '@',
      value: `v=spf1 ${include} ~all`,
      note: `Add to ${domain} root. If you already have an SPF record, add "${include}" to it (only one SPF record allowed).`,
    })
  }

  if (provider === 'gmail') {
    records.push({
      purpose: 'dkim',
      type: 'TXT',
      host: 'google._domainkey',
      value: 'v=DKIM1; k=rsa; p=<key from Google Workspace → Apps → Gmail → Authenticate email>',
      note: 'Generate + start authentication in the Google Workspace admin console, then paste the TXT value here.',
    })
  } else if (provider === 'microsoft') {
    records.push({
      purpose: 'dkim',
      type: 'CNAME',
      host: 'selector1._domainkey',
      value: `selector1-${domain.replace(/\./g, '-')}._domainkey.<tenant>.onmicrosoft.com`,
      note: 'Enable DKIM in the Microsoft 365 Defender portal; it publishes selector1 + selector2 CNAMEs.',
    })
    records.push({
      purpose: 'dkim',
      type: 'CNAME',
      host: 'selector2._domainkey',
      value: `selector2-${domain.replace(/\./g, '-')}._domainkey.<tenant>.onmicrosoft.com`,
    })
  }

  records.push({
    purpose: 'dmarc',
    type: 'TXT',
    host: '_dmarc',
    value: 'v=DMARC1; p=none; rua=mailto:dmarc@' + domain + '; fo=1',
    note: 'Start with p=none to monitor, then tighten to p=quarantine / p=reject once aligned.',
  })

  return records
}

/** Pass if any resolved root TXT record contains the provider's SPF include. */
export function checkSpf(provider: MailProvider, txtRecords: string[]): DnsVerification {
  const include = SPF_INCLUDE[provider]
  if (!include) return 'unknown'
  const spfRecords = txtRecords.filter((r) => /^v=spf1\b/i.test(r.trim()))
  if (!spfRecords.length) return 'fail'
  return spfRecords.some((r) => r.toLowerCase().includes(include)) ? 'pass' : 'fail'
}

/** Pass if a TXT record at _dmarc declares a DMARC1 policy. */
export function checkDmarc(dmarcTxtRecords: string[]): DnsVerification {
  if (!dmarcTxtRecords.length) return 'fail'
  return dmarcTxtRecords.some((r) => /^v=dmarc1\b/i.test(r.trim())) ? 'pass' : 'fail'
}

/**
 * Pass if the provider's DKIM selector is present.
 * - gmail: a TXT at google._domainkey containing v=DKIM1 (+ a public key).
 * - microsoft: a CNAME at selector1._domainkey resolving to onmicrosoft.com.
 */
export function checkDkim(
  provider: MailProvider,
  lookups: { txt?: string[]; cname?: string[] },
): DnsVerification {
  if (provider === 'gmail') {
    const txt = lookups.txt ?? []
    if (!txt.length) return 'fail'
    return txt.some((r) => /v=dkim1/i.test(r) && /p=\S/i.test(r)) ? 'pass' : 'fail'
  }
  if (provider === 'microsoft') {
    const cname = lookups.cname ?? []
    return cname.some((c) => /onmicrosoft\.com/i.test(c)) ? 'pass' : 'fail'
  }
  return 'unknown'
}

export function summarizeDomainAuth(
  spf: DnsVerification,
  dkim: DnsVerification,
  dmarc: DnsVerification,
): DomainAuthResult {
  return { spf, dkim, dmarc, verified: spf === 'pass' && dkim === 'pass' && dmarc === 'pass' }
}

/** Provider-specific DKIM selector hostnames to resolve. */
export function dkimSelectors(provider: MailProvider): string[] {
  if (provider === 'gmail') return ['google._domainkey']
  if (provider === 'microsoft') return ['selector1._domainkey', 'selector2._domainkey']
  return []
}
