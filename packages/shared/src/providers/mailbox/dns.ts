/**
 * Server-side DNS resolution feeding the pure deliverability matchers. The ONLY
 * place node:dns is used. SERVER-ONLY. Reached via ../server.ts.
 */
import { resolveTxt, resolveCname } from 'node:dns/promises'
import {
  checkSpf,
  checkDmarc,
  checkDkim,
  dkimSelectors,
  summarizeDomainAuth,
  type DnsVerification,
  type DomainAuthResult,
  type MailProvider,
} from '../../deliverability'

/** TXT records arrive as string[][] (chunked); join each record's chunks. Never throws. */
async function safeResolveTxt(name: string): Promise<string[]> {
  try {
    const records = await resolveTxt(name)
    return records.map((chunks) => chunks.join(''))
  } catch {
    return []
  }
}
async function safeResolveCname(name: string): Promise<string[]> {
  try {
    return await resolveCname(name)
  } catch {
    return []
  }
}

export function domainFromEmail(email: string): string {
  return email.split('@')[1] ?? ''
}

/** Resolve + verify SPF, DKIM, and DMARC for a sending domain. Pure-result, never throws. */
export async function resolveDomainAuth(
  provider: MailProvider,
  domain: string,
): Promise<DomainAuthResult> {
  const spf = checkSpf(provider, await safeResolveTxt(domain))
  const dmarc = checkDmarc(await safeResolveTxt(`_dmarc.${domain}`))

  let dkim: DnsVerification = 'fail'
  for (const selector of dkimSelectors(provider)) {
    const host = `${selector}.${domain}`
    if (provider === 'microsoft') {
      dkim = checkDkim(provider, { cname: await safeResolveCname(host) })
    } else {
      dkim = checkDkim(provider, { txt: await safeResolveTxt(host) })
    }
    if (dkim === 'pass') break
  }

  return summarizeDomainAuth(spf, dkim, dmarc)
}
