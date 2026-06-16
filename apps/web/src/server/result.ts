import { ZodError } from 'zod'
import {
  ForbiddenError,
  DatabaseUnavailableError,
  TenantNotFoundError,
  MissingContextError,
} from '@tradepilot/db'

export type ActionErrorCode =
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DB_UNAVAILABLE'
  | 'UNAUTHENTICATED'
  | 'UNKNOWN'

export interface ActionError {
  code: ActionErrorCode
  message: string
  fieldErrors?: Record<string, string[]>
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ActionError }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const err = (e: ActionError): Result<never> => ({ ok: false, error: e })

/** Thrown inside actions when a tenant-scoped lookup misses; mapped to NOT_FOUND. */
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string } | undefined)?.code === '23505'
}

/**
 * Wrap a server-action body so it ALWAYS returns Result<T> rather than throwing
 * across the RSC boundary. Known errors map to typed, toast-safe codes; unknown
 * errors are logged and redacted.
 */
export async function withAction<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn())
  } catch (e) {
    if (e instanceof Error && e.name === 'NotFoundError') {
      return err({ code: 'NOT_FOUND', message: e.message })
    }
    if (e instanceof ZodError) {
      return err({
        code: 'VALIDATION',
        message: 'Please correct the highlighted fields.',
        fieldErrors: e.flatten().fieldErrors as Record<string, string[]>,
      })
    }
    if (e instanceof ForbiddenError) {
      return err({ code: 'FORBIDDEN', message: 'You do not have permission to do this.' })
    }
    if (e instanceof TenantNotFoundError || e instanceof MissingContextError) {
      return err({ code: 'UNAUTHENTICATED', message: 'Your session expired. Please sign in again.' })
    }
    if (e instanceof DatabaseUnavailableError) {
      return err({ code: 'DB_UNAVAILABLE', message: 'The database is not configured yet.' })
    }
    if (isUniqueViolation(e)) {
      return err({ code: 'CONFLICT', message: 'A record with these unique fields already exists.' })
    }
    console.error('[action] unexpected error', e)
    return err({ code: 'UNKNOWN', message: 'Something went wrong. Please try again.' })
  }
}
