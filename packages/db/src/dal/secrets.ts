import type { TenantSecretResolver } from './context'

/** Always returns null — used for the dev/test/system context (no stored secrets). */
export function makeNullSecretResolver(): TenantSecretResolver {
  return {
    async get() {
      return null
    },
  }
}

/**
 * Resolve a tenant's decrypted provider secrets. Returns null (never throws) for
 * a missing key so callers degrade gracefully.
 *
 * Phase 0: no provider-secret table exists yet, so this is a null resolver.
 * P3/P8 wire it to read encrypted mailbox tokens / provider keys and decrypt().
 */
export function makeSecretResolver(_tenantId: string): TenantSecretResolver {
  return makeNullSecretResolver()
}
