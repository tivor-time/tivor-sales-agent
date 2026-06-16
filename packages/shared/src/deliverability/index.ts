/**
 * @tradepilot/shared/deliverability — pure deliverability helpers: domain-auth
 * record definitions + verification matchers, warmup ramp, suppression matching,
 * and the send-eligibility gate. The DNS resolution + sending live server-side.
 */
export * from './types'
export {
  expectedDnsRecords,
  checkSpf,
  checkDmarc,
  checkDkim,
  summarizeDomainAuth,
  dkimSelectors,
} from './domain-auth'
export { DEFAULT_WARMUP, canWarmupSend, nextWarmup, type WarmupConfig } from './warmup'
export {
  isSuppressed,
  normalizeSuppressionEmail,
  emailDomain,
  type SuppressionKey,
} from './suppression'
export { canSend, type SendGateInput, type SendGate } from './send-gate'
