/**
 * @tradepilot/shared/outreach — pure outreach helpers: spam-word scoring, native
 * localized fallback templates, and shared draft types. AI generation lives in
 * the web app (server-only); this module is what works with zero AI configured.
 */
export * from './types'
export { scoreSpam } from './spam'
export { renderFallbackDraft, buildProductLine, buildFooter } from './templates'
