import 'server-only'
import { auth, currentUser } from '@clerk/nextjs/server'
import { flags } from '@tradepilot/shared/env'
import type { Role } from '@tradepilot/shared'
import { ensureTenant, MissingContextError, type TenantContextPartial } from '@tradepilot/db'

// In zero-auth dev mode, use the seeded SDAE reference tenant so the dev workspace
// shows its catalog + leads (rather than a separate empty tenant).
const LOCAL_DEV = {
  clerkOrgId: 'org_sdae_seed',
  clerkUserId: 'user_sdae_seed',
  orgName: 'Sri Durga Agro Exports',
  userEmail: 'info@tivor.us',
} as const

function mapClerkRole(orgRole?: string | null): Role {
  if (orgRole === 'org:owner') return 'owner'
  if (orgRole === 'org:admin') return 'admin'
  return 'member'
}

/**
 * Resolve the tenant context for the current request.
 * - Auth disabled (zero secrets): a single local dev tenant (owner).
 * - Auth enabled: map the active Clerk org/user/role, lazily ensuring DB rows exist.
 *
 * Requires a configured database; callers should guard with isDbConfigured() and
 * render a "connect database" state when it is absent.
 */
export async function resolveTenantContext(): Promise<TenantContextPartial> {
  if (!flags.isAuthEnabled) {
    return ensureTenant({ ...LOCAL_DEV, role: 'owner' })
  }

  const { userId, orgId, orgRole } = await auth()
  if (!userId) throw new MissingContextError('Not signed in.')
  if (!orgId) throw new MissingContextError('No active organization.')

  const user = await currentUser()
  return ensureTenant({
    clerkOrgId: orgId,
    clerkUserId: userId,
    role: mapClerkRole(orgRole),
    userEmail: user?.primaryEmailAddress?.emailAddress,
  })
}
