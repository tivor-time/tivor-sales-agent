import type { RawSheet, ColumnMapping, MappedRow, ImportField } from './types'

const SYNONYMS: Record<ImportField, string[]> = {
  companyName: [
    'company',
    'companyname',
    'company name',
    'account',
    'organisation',
    'organization',
    'firma',
    'firmenname',
    'razonsocial',
    'entreprise',
    'importer',
    'buyer',
    'consignee',
  ],
  website: ['website', 'web', 'url', 'site', 'homepage', 'webseite', 'sitio web'],
  domain: ['domain', 'apex', 'rootdomain', 'root domain'],
  country: ['country', 'land', 'pais', 'pays', 'kraj', 'countrycode', 'iso'],
  region: ['region', 'state', 'province', 'bundesland'],
  city: ['city', 'town', 'stadt', 'ciudad', 'ville', 'miasto'],
  industry: ['industry', 'sector', 'branche', 'sektor', 'industria'],
  language: ['language', 'lang', 'sprache', 'idioma', 'langue', 'locale'],
  tags: ['tags', 'labels', 'segment', 'list'],
  contactEmail: ['email', 'e-mail', 'mail', 'emailaddress', 'email address', 'correo', 'courriel'],
  contactFirstName: ['firstname', 'first name', 'givenname', 'vorname', 'nombre', 'prenom'],
  contactLastName: ['lastname', 'last name', 'surname', 'nachname', 'apellido', 'nom'],
  contactTitle: ['title', 'jobtitle', 'job title', 'position', 'role', 'titel', 'cargo', 'fonction'],
  contactPhone: ['phone', 'tel', 'telephone', 'mobile', 'telefon', 'telefono'],
  contactLinkedinUrl: ['linkedin', 'linkedinurl', 'linkedin url', 'li'],
}

const norm = (h: string) =>
  h
    .toLowerCase()
    .replace(/[\s._\-/]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()

/** Best-effort header -> field mapping using a multilingual synonym table. */
export function autoDetectMapping(sheet: RawSheet): ColumnMapping {
  const mapping: ColumnMapping = {}
  const used = new Set<number>()
  const headers = sheet.headers.map(norm)
  for (const field of Object.keys(SYNONYMS) as ImportField[]) {
    const syns = SYNONYMS[field].map(norm)
    let bestIdx = -1
    let bestRank = Infinity
    headers.forEach((h, idx) => {
      if (used.has(idx) || !h) return
      const rank = syns.includes(h)
        ? 0
        : syns.some((s) => h.startsWith(s))
          ? 1
          : syns.some((s) => h.includes(s) || s.includes(h))
            ? 2
            : Infinity
      if (rank < bestRank) {
        bestRank = rank
        bestIdx = idx
      }
    })
    if (bestIdx >= 0 && bestRank < Infinity) {
      mapping[field] = bestIdx
      used.add(bestIdx)
    }
  }
  return mapping
}

/** Project a parsed sheet into typed lead+contact rows using a column mapping. */
export function applyMapping(sheet: RawSheet, mapping: ColumnMapping): MappedRow[] {
  const get = (row: string[], f: ImportField): string => {
    const i = mapping[f]
    return i == null ? '' : (row[i] ?? '').trim()
  }
  return sheet.rows.map((row, rowIndex) => {
    const raw: Record<string, string> = {}
    sheet.headers.forEach((h, i) => {
      if (h) raw[h] = (row[i] ?? '').trim()
    })
    const tagsRaw = get(row, 'tags')
    return {
      rowIndex,
      lead: {
        companyName: get(row, 'companyName'),
        website: get(row, 'website') || undefined,
        domain: get(row, 'domain') || undefined,
        country: get(row, 'country') || undefined,
        region: get(row, 'region') || undefined,
        city: get(row, 'city') || undefined,
        industry: get(row, 'industry') || undefined,
        language: get(row, 'language') || undefined,
        tags: tagsRaw
          ? tagsRaw
              .split(/[;,|]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      },
      contact: {
        email: get(row, 'contactEmail') || undefined,
        firstName: get(row, 'contactFirstName') || undefined,
        lastName: get(row, 'contactLastName') || undefined,
        title: get(row, 'contactTitle') || undefined,
        phone: get(row, 'contactPhone') || undefined,
        linkedinUrl: get(row, 'contactLinkedinUrl') || undefined,
      },
      raw,
    }
  })
}
