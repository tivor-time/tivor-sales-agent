import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { flags } from '@tradepilot/shared/env'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'

export default async function OnboardingPage() {
  // Dev (zero-secrets) mode: no Clerk, no org concept — go straight in.
  if (!flags.isAuthEnabled) redirect('/dashboard')

  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')
  if (orgId) redirect('/dashboard') // already onboarded

  return (
    <div className="dark relative grid min-h-svh place-items-center overflow-hidden bg-background p-6 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_-10%,hsl(var(--primary)/0.14),transparent_70%)]"
      />
      <div className="relative w-full max-w-md">
        <OnboardingForm />
      </div>
    </div>
  )
}
