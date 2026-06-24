import { describe, it, expect } from 'vitest'
import { checkSpf, checkDmarc, checkDkim, expectedDnsRecords } from './domain-auth'
import { nextWarmup, DEFAULT_WARMUP } from './warmup'
import { isSuppressed } from './suppression'
import { canSend, type SendGateInput } from './send-gate'

describe('domain-auth checks', () => {
  it('verifies SPF includes per provider', () => {
    expect(checkSpf('gmail', ['v=spf1 include:_spf.google.com ~all'])).toBe('pass')
    expect(checkSpf('microsoft', ['v=spf1 include:spf.protection.outlook.com -all'])).toBe('pass')
    expect(checkSpf('gmail', ['v=spf1 include:spf.protection.outlook.com ~all'])).toBe('fail')
    expect(checkSpf('gmail', [])).toBe('fail')
  })
  it('verifies DMARC + DKIM', () => {
    expect(checkDmarc(['v=DMARC1; p=none'])).toBe('pass')
    expect(checkDmarc(['nothing'])).toBe('fail')
    expect(checkDkim('gmail', { txt: ['v=DKIM1; k=rsa; p=MIGf...'] })).toBe('pass')
    expect(checkDkim('microsoft', { cname: ['selector1-x._domainkey.t.onmicrosoft.com'] })).toBe('pass')
    expect(checkDkim('microsoft', { cname: [] })).toBe('fail')
  })
  it('lists records to add per provider', () => {
    const g = expectedDnsRecords('gmail', 'example.com')
    expect(g.find((r) => r.purpose === 'spf')?.value).toContain('_spf.google.com')
    expect(g.some((r) => r.purpose === 'dmarc')).toBe(true)
  })
})

describe('warmup ramp', () => {
  it('ramps from not_started to active over time', () => {
    let state = nextWarmup('not_started', 0)
    expect(state).toEqual({ warmupState: 'warming', dailyCap: DEFAULT_WARMUP.baseCap })
    // keep ticking until active
    let guard = 0
    while (state.warmupState === 'warming' && guard++ < 100) {
      state = nextWarmup(state.warmupState, state.dailyCap)
    }
    expect(state.warmupState).toBe('active')
    expect(state.dailyCap).toBe(DEFAULT_WARMUP.targetCap)
  })
})

describe('suppression', () => {
  const entries = [
    { scope: 'email' as const, value: 'optout@acme.de' },
    { scope: 'domain' as const, value: 'blocked.com' },
  ]
  it('matches by email and by domain', () => {
    expect(isSuppressed('OptOut@Acme.de', entries)).toBe(true)
    expect(isSuppressed('anyone@blocked.com', entries)).toBe(true)
    expect(isSuppressed('buyer@allowed.com', entries)).toBe(false)
  })
})

describe('send gate', () => {
  const ok: SendGateInput = {
    tenantSendingEnabled: true,
    identitySendingEnabled: true,
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    warmupState: 'active',
    sentToday: 5,
    dailyCap: 20,
  }
  it('allows a fully-verified, under-cap mailbox', () => {
    expect(canSend(ok).allowed).toBe(true)
  })
  it('blocks until domain auth verifies', () => {
    expect(canSend({ ...ok, dkim: 'fail' }).allowed).toBe(false)
  })
  it('allows send when domain auth bypass is enabled', () => {
    expect(canSend({ ...ok, dkim: 'fail', allowUnverifiedDomainAuth: true }).allowed).toBe(true)
  })
  it('blocks at the daily cap', () => {
    expect(canSend({ ...ok, sentToday: 20 }).allowed).toBe(false)
  })
  it('blocks when workspace sending is off', () => {
    expect(canSend({ ...ok, tenantSendingEnabled: false }).allowed).toBe(false)
  })
})
