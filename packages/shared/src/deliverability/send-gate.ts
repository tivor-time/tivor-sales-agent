import type { DnsVerification, WarmupState } from './types'
import { canWarmupSend } from './warmup'

export interface SendGateInput {
  tenantSendingEnabled: boolean
  identitySendingEnabled: boolean
  spf: DnsVerification
  dkim: DnsVerification
  dmarc: DnsVerification
  warmupState: WarmupState
  sentToday: number
  dailyCap: number
}

export interface SendGate {
  allowed: boolean
  reason?: string
}

/**
 * The single send-eligibility gate, used by the send pipeline (and surfaced in
 * the UI). Sending stays OFF until SPF+DKIM+DMARC verify — a hard constraint.
 */
export function canSend(i: SendGateInput): SendGate {
  if (!i.tenantSendingEnabled) return { allowed: false, reason: 'Sending is disabled for this workspace.' }
  if (!i.identitySendingEnabled) return { allowed: false, reason: 'Mailbox sending is off.' }
  if (!(i.spf === 'pass' && i.dkim === 'pass' && i.dmarc === 'pass')) {
    return { allowed: false, reason: 'Domain authentication (SPF/DKIM/DMARC) is not verified.' }
  }
  if (!canWarmupSend(i.warmupState)) {
    return { allowed: false, reason: `Mailbox warmup is ${i.warmupState}.` }
  }
  if (i.sentToday >= i.dailyCap) {
    return { allowed: false, reason: 'Daily sending cap reached.' }
  }
  return { allowed: true }
}
