import { ROLE_RANK, type Role } from '@tradepilot/shared'
import { ForbiddenError } from '@tradepilot/db'

/** Throw ForbiddenError unless ctx.role >= min. Real authorization gate (server-side). */
export function requireRole(ctx: { role: Role }, min: Role): void {
  if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) throw new ForbiddenError(min)
}
