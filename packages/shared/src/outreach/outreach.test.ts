import { describe, it, expect } from 'vitest'
import { scoreSpam } from './spam'
import { renderFallbackDraft } from './templates'
import { DEFAULT_SEQUENCE_STEPS, type DraftInput } from './types'

describe('scoreSpam', () => {
  it('flags spammy copy and clears clean copy', () => {
    const spammy = scoreSpam('ACT NOW — 100% FREE!!!', 'Click here to claim your FREE cash prize, guaranteed!')
    expect(spammy.level).toBe('high')
    expect(spammy.hits.length).toBeGreaterThan(0)

    const clean = scoreSpam(
      'Gherkins for Berlin Pickle',
      'Hi Anna,\n\nWe export Grade 40 gherkins. Open to samples?\n\nBest, SDAE',
    )
    expect(clean.level).toBe('low')
  })
})

describe('renderFallbackDraft', () => {
  const base: DraftInput = {
    language: 'de',
    lead: { companyName: 'Berlin Pickle GmbH', country: 'DE', industry: 'Lebensmittelhandel' },
    contact: { firstName: 'Anna', title: 'Einkauf' },
    sender: {
      companyName: 'Sri Durga Agro Exports',
      certifications: ['HACCP', 'Kosher'],
      physicalAddress: 'Hyderabad, India',
    },
    catalog: [{ name: 'Gherkins Grade 40', grade: '40', packaging: 'brine' }],
    step: DEFAULT_SEQUENCE_STEPS[0]!,
    unsubscribeUrl: 'https://app.tradepilot.test/u/abc',
  }

  it('renders a localized intro with greeting, product, certs, and unsubscribe footer', () => {
    const d = renderFallbackDraft(base)
    expect(d.generatedByAi).toBe(false)
    expect(d.bodyText).toContain('Guten Tag Anna,')
    expect(d.bodyText).toContain('Gherkins Grade 40')
    expect(d.bodyText).toContain('(HACCP, Kosher)')
    expect(d.bodyText).toContain('https://app.tradepilot.test/u/abc')
    expect(d.bodyText).toContain('Sri Durga Agro Exports')
    expect(d.subject.length).toBeGreaterThan(0)
    expect(d.spam.level).toBe('low')
  })

  it('handles a missing contact name and falls back to a generic greeting', () => {
    const d = renderFallbackDraft({ ...base, language: 'en', contact: undefined })
    expect(d.bodyText.startsWith('Hello,')).toBe(true)
  })

  it('covers all 4 sequence steps in every language', () => {
    for (const lang of ['en', 'de', 'es', 'fr', 'pl'] as const) {
      for (const step of DEFAULT_SEQUENCE_STEPS) {
        const d = renderFallbackDraft({ ...base, language: lang, step })
        expect(d.subject.length).toBeGreaterThan(0)
        expect(d.bodyText.length).toBeGreaterThan(0)
      }
    }
  })
})
