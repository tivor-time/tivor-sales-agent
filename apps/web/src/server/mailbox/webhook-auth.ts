import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Constant-time secret comparison for webhook auth (CWE-208 mitigation).
 *
 * Both sides are SHA-256 hashed first so the buffers are always equal length —
 * this avoids the length-leak and the length-mismatch throw of timingSafeEqual,
 * and removes the byte-wise short-circuit of plain `===`.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
