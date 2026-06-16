import { NextResponse, type NextRequest } from 'next/server'
import { flags } from '@tradepilot/shared/env'
import type { Role } from '@tradepilot/shared'
import {
  upsertTenantFromClerk,
  upsertUserFromClerk,
  upsertMembershipFromClerk,
  deleteMembership,
} from '@tradepilot/db'

function mapRole(orgRole?: string): Role {
  if (orgRole === 'org:owner') return 'owner'
  if (orgRole === 'org:admin') return 'admin'
  return 'member'
}

/** Clerk org/user/membership sync. Svix-verified; no-op (503) when unconfigured. */
export async function POST(req: NextRequest) {
  if (!flags.isClerkWebhookEnabled) {
    return new NextResponse('webhooks disabled', { status: 503 })
  }

  // Loaded lazily so the verifier (and its raw-body handling) only run when configured.
  const { verifyWebhook } = await import('@clerk/nextjs/webhooks')

  let evt
  try {
    evt = await verifyWebhook(req)
  } catch {
    return new NextResponse('invalid signature', { status: 400 })
  }

  // Clerk payload shapes vary by event; narrow ad hoc.
  const data = evt.data as Record<string, any>

  try {
    switch (evt.type) {
      case 'organization.created':
      case 'organization.updated':
        await upsertTenantFromClerk({ clerkOrgId: data.id, name: data.name ?? data.id, slug: data.slug })
        break
      case 'user.created':
      case 'user.updated':
        await upsertUserFromClerk({
          clerkUserId: data.id,
          email: data.email_addresses?.[0]?.email_address ?? `${data.id}@unknown.local`,
          firstName: data.first_name ?? undefined,
          lastName: data.last_name ?? undefined,
          imageUrl: data.image_url ?? undefined,
        })
        break
      case 'organizationMembership.created':
      case 'organizationMembership.updated':
        await upsertMembershipFromClerk({
          clerkOrgId: data.organization?.id,
          clerkUserId: data.public_user_data?.user_id,
          role: mapRole(data.role),
        })
        break
      case 'organizationMembership.deleted':
        await deleteMembership({
          clerkOrgId: data.organization?.id,
          clerkUserId: data.public_user_data?.user_id,
        })
        break
      default:
        break
    }
  } catch {
    return new NextResponse('processing error', { status: 500 })
  }

  return new NextResponse('ok', { status: 200 })
}
