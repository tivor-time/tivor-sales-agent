import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Bot, Inbox, Send } from 'lucide-react'
import { flags } from '@tradepilot/shared/env'
import { Button } from '@/components/ui/button'

const FEATURES = [
  {
    icon: Send,
    title: 'Outreach on autopilot',
    body: 'AI drafts personalized, spam-safe cold emails per lead and sends them through your own Gmail.',
  },
  {
    icon: Inbox,
    title: 'Replies, triaged',
    body: 'Inbound mail syncs into a clean inbox and is auto-classified by buyer intent and ICP fit.',
  },
  {
    icon: Bot,
    title: 'A copilot that acts',
    body: 'Ask it to find leads, summarize replies, or draft and send an email — it works off your live data.',
  },
]

export default function LandingPage() {
  // Zero-secrets dev mode has no auth — go straight into the workspace.
  if (!flags.isAuthEnabled) redirect('/dashboard')

  return (
    <div className="dark relative min-h-svh overflow-hidden bg-background text-foreground">
      {/* Ambient backdrop: a soft brand glow + faint grid, kept restrained. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_100%_at_50%_-10%,hsl(var(--primary)/0.16),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)] bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:56px_56px]"
      />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              TP
            </div>
            <span className="text-base font-semibold tracking-tight">TradePilot</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center py-24 text-center sm:py-32">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            AI sales agent for B2B export
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Find buyers, email them, and follow up — on autopilot.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            TradePilot connects your mailbox, writes personalized cold emails, schedules follow-ups,
            and triages every reply — so your pipeline runs itself.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            No credit card required · Connect Gmail in one click
          </p>
        </section>

        <section className="grid gap-4 pb-28 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-border hover:bg-card/80"
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 transition-colors group-hover:bg-primary/15">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            )
          })}
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© TradePilot</span>
          <span>Made for export teams</span>
        </div>
      </footer>
    </div>
  )
}
