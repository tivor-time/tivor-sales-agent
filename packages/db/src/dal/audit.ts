import type { AppTransaction } from '../client/pool'
import { auditEvents } from '../schema'
import type { TenantContext } from './context'

/** Audit verbs — a subset of the audit_action enum used by the DAL. */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'soft_delete'
  | 'restore'
  | 'send'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import'
  | 'oauth_connect'
  | 'oauth_revoke'
  | 'billing_change'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SECRET_KEY_RE = /(token|secret|password|api[_-]?key|authorization|oauth|_enc$)/i

/** Mask any obviously-sensitive fields before writing to the audit log. */
function redactRecord(value: unknown): Record<string, unknown> | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY_RE.test(k) ? '[redacted]' : v
  }
  return out
}

/**
 * Write an AuditEvent in the SAME transaction as the mutation, so audit and
 * mutation commit or roll back together. Never logs decrypted secrets/tokens.
 */
export async function writeAudit(
  tx: AppTransaction,
  ctx: TenantContext,
  e: {
    action: AuditAction
    entityType: string
    entityId: string | null
    before?: unknown
    after?: unknown
  },
): Promise<void> {
  await tx.insert(auditEvents).values({
    tenantId: ctx.tenantId,
    actorUserId: UUID_RE.test(ctx.userId) ? ctx.userId : null,
    actorType: ctx.source === 'worker' ? 'system' : 'user',
    source: ctx.source,
    requestId: ctx.requestId,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    before: redactRecord(e.before) ?? null,
    after: redactRecord(e.after) ?? null,
  })
}
