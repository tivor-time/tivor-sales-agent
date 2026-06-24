'use server'

import { z } from 'zod'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  ensureTenant,
  updateTenantName,
  updateTenantCompanyProfile,
  MissingContextError,
} from '@tradepilot/db'
import { withAction, type Result } from '@/server/result'

const onboardingSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
})

/**
 * Persist onboarding details to the tenant. Resolves the tenant by the org id the
 * client just created (passed in) rather than the session's ACTIVE org — Clerk's
 * setActive() hasn't necessarily propagated to the server at this instant, so
 * relying on auth().orgId here races and fails. We only need the signed-in userId
 * (always available) + the known orgId to ensure the tenant row and write to it.
 */
export async function completeOnboarding(input: unknown): Promise<Result<{ ok: true }>> {
  return withAction(async () => {
    const { orgId, name, city, state } = onboardingSchema.parse(input)
    const { userId } = await auth()
    if (!userId) throw new MissingContextError('Not signed in.')
    const user = await currentUser()

    const partial = await ensureTenant({
      clerkOrgId: orgId,
      clerkUserId: userId,
      role: 'owner',
      userEmail: user?.primaryEmailAddress?.emailAddress,
      orgName: name,
    })
    await updateTenantName(partial.tenantId, name)
    await updateTenantCompanyProfile(partial.tenantId, {
      city: city || undefined,
      state: state || undefined,
      onboardedAt: new Date().toISOString(),
    })
    return { ok: true as const }
  })
}
