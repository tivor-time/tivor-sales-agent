import { redirect } from 'next/navigation'
import { SignIn } from '@clerk/nextjs'
import { flags } from '@tradepilot/shared/env'

// NOTE: this is ACCOUNT sign-in (Clerk). It is unrelated to the in-app
// "Connect Gmail" mailbox flow (Unipile), which connects a sending mailbox.
export default function SignInPage() {
  // Zero-secrets dev mode has no Clerk provider — never show an auth wall.
  if (!flags.isAuthEnabled) redirect('/dashboard')
  return <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
}
