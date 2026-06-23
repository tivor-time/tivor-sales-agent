import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildMime, encodeHeaderWord } from './mime'

describe('buildMime', () => {
  it('emits core headers and a plain-text body', () => {
    const mime = buildMime({
      from: 'a@x.com',
      to: 'b@y.com',
      subject: 'Hello',
      text: 'Hi there',
      messageId: '<1@x.com>',
    })
    expect(mime).toContain('From: a@x.com')
    expect(mime).toContain('To: b@y.com')
    expect(mime).toContain('Subject: Hello')
    expect(mime).toContain('Message-ID: <1@x.com>')
    expect(mime).toContain('MIME-Version: 1.0')
    expect(mime).toContain('Content-Type: text/plain')
  })

  it('builds multipart/alternative when html is present', () => {
    const mime = buildMime({
      from: 'a@x.com',
      to: 'b@y.com',
      subject: 'S',
      text: 't',
      html: '<p>t</p>',
      messageId: '<2@x.com>',
    })
    expect(mime).toContain('multipart/alternative')
    expect(mime).toContain('text/html')
  })

  it('adds threading + list-unsubscribe headers when given', () => {
    const mime = buildMime({
      from: 'a@x.com',
      to: 'b@y.com',
      subject: 'S',
      text: 't',
      messageId: '<3@x.com>',
      inReplyTo: '<0@x.com>',
      references: ['<a@x.com>', '<b@x.com>'],
      listUnsubscribe: '<mailto:u@x.com>',
    })
    expect(mime).toContain('In-Reply-To: <0@x.com>')
    expect(mime).toContain('References: <a@x.com> <b@x.com>')
    expect(mime).toContain('List-Unsubscribe: <mailto:u@x.com>')
    expect(mime).toContain('List-Unsubscribe-Post: List-Unsubscribe=One-Click')
  })

  it('RFC2047-encodes a non-ASCII subject only', () => {
    expect(encodeHeaderWord('Grüße')).toMatch(/^=\?utf-8\?B\?/)
    expect(encodeHeaderWord('plain ascii')).toBe('plain ascii')
  })
})

// --- DNS resolver: mock node:dns/promises so no network is hit ---
const resolveTxt = vi.fn()
const resolveCname = vi.fn()
vi.mock('node:dns/promises', () => ({
  resolveTxt: (n: string) => resolveTxt(n),
  resolveCname: (n: string) => resolveCname(n),
}))

const { resolveDomainAuth, domainFromEmail } = await import('./dns')

describe('resolveDomainAuth', () => {
  beforeEach(() => {
    resolveTxt.mockReset()
    resolveCname.mockReset()
  })

  it('verifies a fully-configured gmail domain', async () => {
    resolveTxt.mockImplementation(async (name: string) => {
      if (name === 'example.com') return [['v=spf1 include:_spf.google.com ~all']]
      if (name === '_dmarc.example.com') return [['v=DMARC1; p=none']]
      if (name === 'google._domainkey.example.com') return [['v=DKIM1; k=rsa; p=ABCDEF']]
      return []
    })
    const r = await resolveDomainAuth('gmail', 'example.com')
    expect(r).toEqual({ spf: 'pass', dkim: 'pass', dmarc: 'pass', verified: true })
  })

  it('fails (never throws) when records are missing', async () => {
    resolveTxt.mockResolvedValue([])
    resolveCname.mockResolvedValue([])
    const r = await resolveDomainAuth('gmail', 'nope.com')
    expect(r.verified).toBe(false)
    expect(r.spf).toBe('fail')
  })

  it('uses CNAME for microsoft DKIM', async () => {
    resolveTxt.mockImplementation(async (name: string) => {
      if (name === 'example.com') return [['v=spf1 include:spf.protection.outlook.com ~all']]
      if (name === '_dmarc.example.com') return [['v=DMARC1; p=reject']]
      return []
    })
    resolveCname.mockResolvedValue(['selector1-example-com._domainkey.contoso.onmicrosoft.com'])
    const r = await resolveDomainAuth('microsoft', 'example.com')
    expect(r.verified).toBe(true)
  })

  it('domainFromEmail extracts the domain', () => {
    expect(domainFromEmail('x@foo.com')).toBe('foo.com')
  })
})
