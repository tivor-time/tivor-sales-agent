'use server'

import { z } from 'zod'
import { getTenantProfile, updateTenantCompanyProfile } from '@tradepilot/db'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, type Result } from '@/server/result'

const setAutopilotSchema = z.object({ enabled: z.boolean() })

/** Read the tenant's Autopilot setting (auto-send + auto-follow-up). */
export async function getAutopilot(): Promise<Result<{ enabled: boolean }>> {
  return withAction(async () => {
    const partial = await resolveTenantContext()
    requireRole(partial, 'member')
    const profile = await getTenantProfile(partial.tenantId)
    return { enabled: (profile.companyProfile as { autopilot?: boolean }).autopilot === true }
  })
}

/** Toggle Autopilot. Admin-only — it lets the AI send without human approval. */
export async function setAutopilot(input: unknown): Promise<Result<{ enabled: boolean }>> {
  return withAction(async () => {
    const { enabled } = setAutopilotSchema.parse(input)
    const partial = await resolveTenantContext()
    requireRole(partial, 'admin')
    await updateTenantCompanyProfile(partial.tenantId, { autopilot: enabled })
    return { enabled }
  })
}
