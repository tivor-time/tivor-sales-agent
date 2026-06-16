import { describe, it, expect } from 'vitest'
import { parseCsv } from './parse'
import { autoDetectMapping, applyMapping } from './mapping'
import {
  normalizeCompanyName,
  extractApexDomain,
  normalizeCountry,
  normalizeEmail,
} from './normalize'
import { nameMatchScore } from './similarity'
import { planDedupe } from './dedupe'
import { scoreIcp, buildScoringCatalog } from './score'
import type { ExistingLeadKey } from './types'

describe('normalizeCompanyName', () => {
  it('strips stacked legal suffixes and lowercases', () => {
    expect(normalizeCompanyName('Sri Durga Agro Exports Pvt Ltd')).toBe('sri durga agro exports')
    expect(normalizeCompanyName('Müller Feinkost GmbH')).toBe('muller feinkost')
    expect(normalizeCompanyName('Pickle Bros Sp. z o.o.')).toBe('pickle bros')
  })
  it('is idempotent', () => {
    const once = normalizeCompanyName('ACME Foods, Inc.')
    expect(normalizeCompanyName(once)).toBe(once)
  })
})

describe('extractApexDomain', () => {
  it('handles websites, www, paths, and emails', () => {
    expect(extractApexDomain('https://www.acme.de/products?x=1')).toBe('acme.de')
    expect(extractApexDomain('buyer@acme.de')).toBe('acme.de')
    expect(extractApexDomain('http://shop.acme.co.uk')).toBe('acme.co.uk')
    expect(extractApexDomain('not a domain')).toBeUndefined()
    expect(extractApexDomain(undefined)).toBeUndefined()
  })
})

describe('normalizeCountry', () => {
  it('maps names and codes to ISO alpha-2', () => {
    expect(normalizeCountry('Germany')).toBe('DE')
    expect(normalizeCountry('deutschland')).toBe('DE')
    expect(normalizeCountry('de')).toBe('DE')
    expect(normalizeCountry('España')).toBe('ES')
    expect(normalizeCountry('Poland')).toBe('PL')
    expect(normalizeCountry('')).toBeUndefined()
  })
})

describe('normalizeEmail', () => {
  it('validates and flags role addresses', () => {
    expect(normalizeEmail('Buyer@Acme.de')).toEqual({ email: 'buyer@acme.de', isValid: true, isRole: false })
    expect(normalizeEmail('info@acme.de').isRole).toBe(true)
    expect(normalizeEmail('nope').isValid).toBe(false)
  })
})

describe('nameMatchScore', () => {
  it('matches reordered token sets and separates distinct names', () => {
    expect(nameMatchScore('sri durga agro', 'agro sri durga')).toBeGreaterThanOrEqual(0.9)
    expect(nameMatchScore('acme foods', 'globex trading')).toBeLessThan(0.82)
  })
})

describe('planDedupe', () => {
  const existing: ExistingLeadKey[] = [
    { id: 'lead-1', domain: 'acme.de', nameNorm: normalizeCompanyName('Acme GmbH'), country: 'DE' },
  ]

  it('merges on exact domain', () => {
    const [d] = planDedupe([{ domain: 'acme.de', companyName: 'Acme', country: 'DE' }], existing)
    expect(d.action).toBe('merge')
    expect(d.matchedBy).toBe('domain')
    expect(d.matchedLeadId).toBe('lead-1')
  })

  it('merges on fuzzy name within the same country', () => {
    const [d] = planDedupe([{ companyName: 'Acme', country: 'DE' }], existing)
    expect(d.action).toBe('merge')
    expect(d.matchedBy).toBe('name')
  })

  it('does not merge a same-name lead in a different country', () => {
    const [d] = planDedupe([{ companyName: 'Acme', country: 'FR' }], existing)
    expect(d.action).toBe('create')
  })

  it('skips a duplicate domain within the same batch', () => {
    const ds = planDedupe(
      [
        { domain: 'globex.fr', companyName: 'Globex', country: 'FR' },
        { domain: 'globex.fr', companyName: 'Globex SARL', country: 'FR' },
      ],
      [],
    )
    expect(ds[0].action).toBe('create')
    expect(ds[1].action).toBe('skip')
  })

  it('creates a clearly distinct lead', () => {
    const [d] = planDedupe([{ companyName: 'Zeta Trading', country: 'PL' }], existing)
    expect(d.action).toBe('create')
  })
})

describe('scoreIcp', () => {
  const catalog = buildScoringCatalog([
    { category: 'gherkins', grade: '40', hsCode: '200110', certifications: ['HACCP'], name: 'Gherkins Grade 40' },
  ])

  it('scores a strong in-market lead highly with reasons', () => {
    const result = scoreIcp(
      {
        companyName: 'Berlin Pickle Importers',
        domain: 'berlinpickle.de',
        country: 'DE',
        city: 'Berlin',
        website: 'https://berlinpickle.de',
        industry: 'food wholesale',
        contact: { email: 'buyer@berlinpickle.de', emailIsValid: true, emailIsRole: false, title: 'Head of Procurement' },
      },
      { targetMarkets: ['DE', 'ES', 'FR', 'PL'], catalog },
    )
    expect(result.score).toBeGreaterThan(70)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('scores an out-of-market, low-signal lead lower', () => {
    const result = scoreIcp(
      { companyName: 'Random LLC', country: 'US' },
      { targetMarkets: ['DE', 'ES', 'FR', 'PL'], catalog },
    )
    expect(result.score).toBeLessThan(40)
  })
})

describe('parse + mapping', () => {
  const csv = [
    'Company,Website,Country,Email,Job Title',
    'Sri Durga Agro,https://sridurgaagro.com,India,info@sridurgaagro.com,Owner',
    'Berlin Pickle GmbH,berlinpickle.de,Germany,buyer@berlinpickle.de,Buyer',
  ].join('\n')

  it('parses headers and rows', () => {
    const sheet = parseCsv(csv)
    expect(sheet.headers).toEqual(['Company', 'Website', 'Country', 'Email', 'Job Title'])
    expect(sheet.rows).toHaveLength(2)
    expect(sheet.meta.rowCount).toBe(2)
  })

  it('auto-detects mapping and projects rows', () => {
    const sheet = parseCsv(csv)
    const mapping = autoDetectMapping(sheet)
    expect(mapping.companyName).toBe(0)
    expect(mapping.website).toBe(1)
    expect(mapping.country).toBe(2)
    expect(mapping.contactEmail).toBe(3)
    expect(mapping.contactTitle).toBe(4)

    const rows = applyMapping(sheet, mapping)
    expect(rows[0].lead.companyName).toBe('Sri Durga Agro')
    expect(rows[1].contact?.email).toBe('buyer@berlinpickle.de')
    expect(rows[0].raw['Company']).toBe('Sri Durga Agro')
  })
})
