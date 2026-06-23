import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { encrypt, decrypt } from '@tradepilot/db'

/**
 * Stateless, tamper-proof OAuth state + PKCE. The PKCE verifier is carried INSIDE
 * the encrypted state (never round-trips in plaintext), so no Redis/session store
 * is needed. Encrypted with the master key under a fixed AAD (there is no tenant
 * context on the provider's callback, so the AAD is a constant, not the tenantId).
 */
const STATE_AAD = 'oauth-state-v1'
const TTL_MS = 10 * 60 * 1000

export type OAuthProvider = 'gmail' | 'microsoft'

interface StatePayload {
  tenantId: string
  userId: string
  provider: OAuthProvider
  verifier: string
  nonce: string
  iat: number
}

/** Mint a PKCE verifier + its S256 challenge. */
export function newPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function packState(p: {
  tenantId: string
  userId: string
  provider: OAuthProvider
  verifier: string
}): string {
  const payload: StatePayload = { ...p, nonce: randomBytes(16).toString('base64url'), iat: Date.now() }
  return encrypt(JSON.stringify(payload), STATE_AAD)
}

/** Decrypt + validate the state (10-min TTL). Returns null on any tampering/expiry. */
export function unpackState(
  state: string,
): { tenantId: string; userId: string; provider: OAuthProvider; verifier: string } | null {
  try {
    const p = JSON.parse(decrypt(state, STATE_AAD)) as StatePayload
    if (typeof p.iat !== 'number' || Date.now() - p.iat > TTL_MS) return null
    if (p.provider !== 'gmail' && p.provider !== 'microsoft') return null
    return { tenantId: p.tenantId, userId: p.userId, provider: p.provider, verifier: p.verifier }
  } catch {
    return null
  }
}
