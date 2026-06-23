import { and, eq, isNull } from 'drizzle-orm'
import { flags } from '@tradepilot/shared/env'
import { withTenantTransaction } from '../client/rls'
import { decrypt } from '../crypto'
import { emailIdentities } from '../schema'
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
 * Resolve a tenant's decrypted secrets. Returns null (never throws) for a missing
 * key so callers degrade gracefully.
 *
 * P3: resolves the coarse tenant-singleton mailbox keys (`gmail_oauth` /
 * `msgraph_oauth`) to the decrypted access token of the tenant's primary
 * sending-enabled identity. The worker send path reads per-row tokens directly;
 * other SecretKeys (resend/stripe/anthropic/enrichment) resolve to null until
 * their phases wire storage.
 */
export function makeSecretResolver(tenantId: string): TenantSecretResolver {
  return {
    async get(key) {
      try {
        if (!flags.isSecretStorageEnabled) return null
        const provider =
          key === 'gmail_oauth' ? 'gmail' : key === 'msgraph_oauth' ? 'microsoft' : null
        if (!provider) return null
        return await withTenantTransaction(tenantId, async (tx) => {
          const rows = await tx
            .select()
            .from(emailIdentities)
            .where(
              and(
                eq(emailIdentities.tenantId, tenantId),
                eq(emailIdentities.provider, provider),
                eq(emailIdentities.sendingEnabled, true),
                isNull(emailIdentities.deletedAt),
              ),
            )
            .limit(1)
          const row = rows[0]
          if (!row?.accessTokenEnc) return null
          return decrypt(row.accessTokenEnc, tenantId)
        })
      } catch {
        return null
      }
    },
  }
}
