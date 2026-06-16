import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { flags } from '@tradepilot/shared/env'

const isPublic = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding(.*)',
  '/api/webhooks/(.*)',
  '/api/health',
])

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return
  const { userId, orgId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()
  // Authenticated but no active org -> force onboarding / org selection.
  if (!orgId && !req.nextUrl.pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }
})

// Zero-secrets boot: when Clerk isn't configured, the middleware is a passthrough.
export default flags.isAuthEnabled ? clerkHandler : () => NextResponse.next()

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
