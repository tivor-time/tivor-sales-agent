/**
 * Structured logger (pino). SERVER-ONLY.
 *
 * Always log with tenant/request context so per-tenant log filtering and the
 * audit trail line up. Read LOG_LEVEL directly from process.env to avoid a
 * circular dependency with env.ts.
 */
import pino, { type Logger } from 'pino'

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info')

export const logger: Logger = pino({
  level,
  base: { service: 'tradepilot' },
  redact: {
    // Never log secrets/tokens even if they slip into a log object.
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'accessToken',
      'refreshToken',
      '*.accessToken',
      '*.refreshToken',
      'authorization',
      '*.authorization',
      'apiKey',
      '*.apiKey',
      'secret',
      '*.secret',
    ],
    censor: '[redacted]',
  },
})

export interface LogContext {
  tenantId?: string
  userId?: string
  requestId?: string
  source?: 'web' | 'worker' | 'test'
  [key: string]: unknown
}

/** Create a child logger bound to a tenant/request context. */
export function withContext(ctx: LogContext): Logger {
  return logger.child(ctx)
}

export type { Logger }
