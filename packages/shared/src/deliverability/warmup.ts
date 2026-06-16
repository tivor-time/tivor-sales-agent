import type { WarmupState } from './types'

export interface WarmupConfig {
  baseCap: number
  targetCap: number
  dailyStep: number
}

/** Conservative default: start 20/day, +20/day, up to 200/day. */
export const DEFAULT_WARMUP: WarmupConfig = { baseCap: 20, targetCap: 200, dailyStep: 20 }

/** Only a warming or fully-active mailbox may send. */
export function canWarmupSend(state: WarmupState): boolean {
  return state === 'warming' || state === 'active'
}

/**
 * Advance the warmup ramp on a daily tick. Pure: returns the next state + cap.
 * not_started -> warming(baseCap); warming ramps +dailyStep until targetCap -> active.
 */
export function nextWarmup(
  state: WarmupState,
  dailyCap: number,
  cfg: WarmupConfig = DEFAULT_WARMUP,
): { warmupState: WarmupState; dailyCap: number } {
  switch (state) {
    case 'not_started':
      return { warmupState: 'warming', dailyCap: cfg.baseCap }
    case 'warming': {
      const next = Math.min(cfg.targetCap, dailyCap + cfg.dailyStep)
      return next >= cfg.targetCap
        ? { warmupState: 'active', dailyCap: cfg.targetCap }
        : { warmupState: 'warming', dailyCap: next }
    }
    case 'active':
      return { warmupState: 'active', dailyCap: cfg.targetCap }
    case 'paused':
    case 'throttled':
      return { warmupState: state, dailyCap }
  }
}
