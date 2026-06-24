import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Bot } from 'lucide-react'
import { flags } from '@tradepilot/shared/env'
import { Button } from '@/components/ui/button'
import { CircuitBackdrop } from '@/components/landing/circuit-backdrop'

export default function LandingPage() {
  // Zero-secrets dev mode has no auth — go straight into the workspace.
  if (!flags.isAuthEnabled) redirect('/dashboard')

  return (
    <div className="dark relative grid min-h-svh place-items-center overflow-hidden bg-[hsl(224_22%_11%)] text-foreground">
      {/* Minimal monochrome circuit backdrop (clerk-style). */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <CircuitBackdrop />
        {/* Soft radial fade keeps the centre calm and the wordmark crisp. */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,hsl(224_22%_11%/0.85),transparent)]" />
      </div>

      <main className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="mb-8 grid h-16 w-16 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_44px_-8px_hsl(var(--primary)/0.7)] ring-1 ring-inset ring-primary/20">
          <Bot className="h-8 w-8" />
        </div>

        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          Trade<span className="text-primary">Pilot</span>
        </h1>
        <p className="mt-4 max-w-xs text-sm text-muted-foreground sm:max-w-sm sm:text-base">
          Your AI sales agent for B2B export outreach.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Button asChild size="lg" className="shadow-[0_0_32px_-8px_hsl(var(--primary)/0.8)]">
            <Link href="/sign-up">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
