/** Cross-cutting domain constants (framework-agnostic, safe for client + server). */

/** Languages the platform generates outreach in. */
export const SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'fr', 'pl'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  pl: 'Polski',
}

/** Tenant membership roles, lowest → highest privilege. */
export const ROLES = ['member', 'admin', 'owner'] as const
export type Role = (typeof ROLES)[number]
export const ROLE_RANK: Record<Role, number> = { member: 0, admin: 1, owner: 2 }

/** Marketplaces TradePilot can generate listing content for. */
export const MARKETPLACES = [
  'alibaba',
  'indiamart',
  'tradeindia',
  'exportersindia',
  'ec21',
  'go4worldbusiness',
  'own_site',
  'other',
] as const
export type Marketplace = (typeof MARKETPLACES)[number]

/** Default per-mailbox sending cap before warmup ramps it up. */
export const DEFAULT_DAILY_SEND_CAP = 20

/** Default cold-email sequence cadence (days after enrollment). */
export const DEFAULT_SEQUENCE_DAYS = [1, 3, 7, 14] as const
