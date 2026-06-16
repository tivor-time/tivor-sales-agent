import type { Language } from '../constants'

const LEGAL_SUFFIXES = [
  'gmbh & co kg',
  'gmbh und co kg',
  'gmbh',
  'mbh',
  'ag',
  'kg',
  'ohg',
  'e k',
  'ug',
  'ltd',
  'limited',
  'llc',
  'inc',
  'incorporated',
  'corp',
  'corporation',
  'co',
  'company',
  'plc',
  'sa',
  'sas',
  'sarl',
  'sl',
  'slu',
  'srl',
  'spa',
  'bv',
  'nv',
  'oy',
  'ab',
  'as',
  's a',
  's l',
  's r l',
  's p a',
  's a s',
  'sp z o o',
  'spolka z o o',
  'sp z oo',
  'sp zoo',
  'sp k',
  's k a',
  'pvt ltd',
  'private limited',
  'pvt',
]
const SUFFIX_RE = new RegExp(
  `\\b(${LEGAL_SUFFIXES.map((s) => s.replace(/ /g, '\\s*')).join('|')})\\b\\.?\\s*$`,
  'i',
)
const ACCENTS_RE = /[̀-ͯ]/g

/** lowercase, strip accents, drop stacked legal suffixes, collapse whitespace. Idempotent. */
export function normalizeCompanyName(input: string): string {
  let s = input.normalize('NFKD').replace(ACCENTS_RE, '')
  s = s.toLowerCase().replace(/[.,]/g, ' ').replace(/&/g, ' and ')
  s = s.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  let prev: string
  do {
    prev = s
    s = s.replace(SUFFIX_RE, '').trim()
  } while (s !== prev)
  return s.replace(/\s+/g, ' ').trim()
}

const PUBLIC_TLDS_2 = new Set([
  'co.uk',
  'com.au',
  'co.in',
  'com.br',
  'co.jp',
  'com.mx',
  'com.tr',
  'co.za',
])

/** website OR email -> apex domain (lowercase, no www, no path), or undefined. */
export function extractApexDomain(value?: string): string | undefined {
  if (!value) return undefined
  let host = value.trim().toLowerCase()
  if (host.includes('@')) host = host.split('@').pop() ?? ''
  host = host.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '')
  host = (host.split(/[/?#]/)[0] ?? '').split(':')[0] ?? ''
  if (!host || !host.includes('.') || /\s/.test(host)) return undefined
  const labels = host.split('.').filter(Boolean)
  if (labels.length < 2) return undefined
  const lastTwo = labels.slice(-2).join('.')
  if (PUBLIC_TLDS_2.has(lastTwo) && labels.length >= 3) return labels.slice(-3).join('.')
  return lastTwo
}

const COUNTRY_TO_ISO: Record<string, string> = {
  germany: 'DE',
  deutschland: 'DE',
  de: 'DE',
  ger: 'DE',
  spain: 'ES',
  espana: 'ES',
  es: 'ES',
  esp: 'ES',
  france: 'FR',
  fr: 'FR',
  fra: 'FR',
  poland: 'PL',
  polska: 'PL',
  pl: 'PL',
  pol: 'PL',
  'united kingdom': 'GB',
  uk: 'GB',
  gb: 'GB',
  'great britain': 'GB',
  netherlands: 'NL',
  nl: 'NL',
  italy: 'IT',
  italia: 'IT',
  it: 'IT',
  'united states': 'US',
  usa: 'US',
  us: 'US',
  austria: 'AT',
  at: 'AT',
  belgium: 'BE',
  be: 'BE',
  switzerland: 'CH',
  ch: 'CH',
}

/** country name or code -> ISO-3166 alpha-2 (uppercase), or undefined. */
export function normalizeCountry(input?: string): string | undefined {
  if (!input) return undefined
  const k = input
    .normalize('NFKD')
    .replace(ACCENTS_RE, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()
  if (/^[a-z]{2}$/.test(k)) return COUNTRY_TO_ISO[k] ?? k.toUpperCase()
  return COUNTRY_TO_ISO[k]
}

const ROLE_LOCALPARTS = new Set([
  'info',
  'sales',
  'contact',
  'office',
  'admin',
  'support',
  'hello',
  'mail',
  'enquiry',
  'enquiries',
  'export',
  'import',
])

export function normalizeEmail(input?: string): { email?: string; isValid: boolean; isRole: boolean } {
  if (!input) return { isValid: false, isRole: false }
  const e = input.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { isValid: false, isRole: false }
  const local = (e.split('@')[0] ?? '').replace(/[._+-].*$/, '')
  return { email: e, isValid: true, isRole: ROLE_LOCALPARTS.has(local) }
}

/** light E.164-ish cleanup; keeps leading +, strips separators. */
export function normalizePhone(input?: string): string | undefined {
  if (!input) return undefined
  const p = input.replace(/[^\d+]/g, '')
  return p.length >= 7 ? p : undefined
}

export function normalizeLanguage(input?: string): Language | undefined {
  const v = input?.trim().toLowerCase().slice(0, 2)
  return (['en', 'de', 'es', 'fr', 'pl'] as const).find((l) => l === v)
}
