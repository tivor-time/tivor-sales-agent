/**
 * Purge ALL leads (and cascaded contacts/provenance) for the SDAE dev tenant.
 * Keeps the tenant, user, and catalog seed. Run from repo root:
 *   set -a; . apps/web/.env; set +a
 *   pnpm --filter @tradepilot/db exec tsx scripts/clear-leads.mts
 */
import { sql } from 'drizzle-orm'
import { ensureTenant, withTenantTransaction } from '../src/index'

const partial = await ensureTenant({
  clerkOrgId: 'org_sdae_seed',
  clerkUserId: 'user_sdae_seed',
  role: 'owner',
  userEmail: 'info@tivor.us',
  orgName: 'Sri Durga Agro Exports',
})

const deleted = await withTenantTransaction(partial.tenantId, async (tx) => {
  const res = await tx.execute(sql`delete from leads where tenant_id = ${partial.tenantId}`)
  return (res as { rowCount?: number }).rowCount ?? 0
})

console.log(JSON.stringify({ tenantId: partial.tenantId, leadsDeleted: deleted }, null, 2))
process.exit(0)
