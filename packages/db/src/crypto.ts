/**
 * Per-tenant secret encryption (AES-256-GCM).
 *
 * - Master key from MASTER_ENCRYPTION_KEY (base64 of 32 random bytes), env-only.
 * - Fresh 12-byte IV per record; 16-byte GCM auth tag.
 * - tenantId bound as GCM AAD: a token row copied to another tenant fails to
 *   decrypt — defense in depth on top of DAL isolation.
 * - Versioned `v1.<iv>.<tag>.<ct>` string format enables key rotation later.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env, flags } from '@tradepilot/shared/env'
import { SecretStorageUnavailableError } from './dal/errors'

const ALGO = 'aes-256-gcm'
const VERSION = 'v1'

function masterKey(): Buffer {
  if (!flags.isSecretStorageEnabled || !env.MASTER_ENCRYPTION_KEY) {
    throw new SecretStorageUnavailableError()
  }
  const key = Buffer.from(env.MASTER_ENCRYPTION_KEY, 'base64')
  if (key.length !== 32) {
    throw new Error('MASTER_ENCRYPTION_KEY must decode to 32 bytes (base64).')
  }
  return key
}

/** Encrypt a plaintext secret, bound to tenantId via AAD. */
export function encrypt(plaintext: string, tenantId: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, masterKey(), iv)
  cipher.setAAD(Buffer.from(tenantId, 'utf8'))
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.')
}

/** Decrypt; throws if AAD/tenant mismatch or tampering. */
export function decrypt(payload: string, tenantId: string): string {
  const [version, ivB64, tagB64, ctB64] = payload.split('.')
  if (version !== VERSION || !ivB64 || !tagB64 || !ctB64) {
    throw new Error(`Unsupported or malformed ciphertext: ${version}`)
  }
  const decipher = createDecipheriv(ALGO, masterKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAAD(Buffer.from(tenantId, 'utf8'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
