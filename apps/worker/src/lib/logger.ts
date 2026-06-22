import { withContext, type Logger } from '@tradepilot/shared/logger'

/** Base worker logger — always tagged source:'worker' for per-source filtering. */
export const log: Logger = withContext({ source: 'worker' })

/** A logger bound to a specific event invocation. */
export function eventLogger(event: string, tenantId?: string, requestId?: string): Logger {
  return withContext({ source: 'worker', event, tenantId, requestId })
}
