import { redirect } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'
import { flags } from '@tradepilot/shared/env'

// ACCOUNT sign-up (Clerk) — "Continue with Google" appears automatically once
// Google is enabled in the Clerk dashboard. New users land on /onboarding to
// create their organization and capture City/State.
export default function SignUpPage() {
  if (!flags.isAuthEnabled) redirect('/dashboard')
  return <SignUp signInUrl="/sign-in" forceRedirectUrl="/onboarding" />
}
