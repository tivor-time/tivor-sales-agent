import 'server-only'
import { randomBytes } from 'node:crypto'
import { encrypt, decrypt } from '@tradepilot/db'

const STATE_AAD = 'unipile-hosted-auth-state-v1'
const TTL_MS = 2 * 60 * 60 * 1000

interface StatePayload {
  tenantId: string
  userId: string
  nonce: string
  iat: number
}

export function packUnipileState(input: { tenantId: string; userId: string }): string {
  const payload: StatePayload = {
    tenantId: input.tenantId,
    userId: input.userId,
    nonce: randomBytes(16).toString('base64url'),
    iat: Date.now(),
  }
  return encrypt(JSON.stringify(payload), STATE_AAD)
}

export function unpackUnipileState(state: string): { tenantId: string; userId: string } | null {
  try {
    const payload = JSON.parse(decrypt(state, STATE_AAD)) as StatePayload
    if (typeof payload.iat !== 'number') return null
    if (Date.now() - payload.iat > TTL_MS) return null
    if (!payload.tenantId || !payload.userId) return null
    return { tenantId: payload.tenantId, userId: payload.userId }
  } catch {
    return null
  }
}

