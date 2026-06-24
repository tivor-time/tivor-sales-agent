import type { ReactNode } from 'react'
import { Bot, Inbox, Send } from 'lucide-react'

const HIGHLIGHTS = [
  { icon: Send, label: 'AI-written cold emails from your own Gmail' },
  { icon: Inbox, label: 'Replies auto-triaged by intent and ICP fit' },
  { icon: Bot, label: 'A copilot that acts on your live pipeline' },
]

/**
 * Minimal auth shell — NO app sidebar/topbar. Forced dark for an on-brand,
 * consistent sign-in surface that matches the dark Clerk appearance.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh lg:grid-cols-2">
        {/* Brand column */}
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border/60 bg-card p-10 lg:flex xl:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_0%,hsl(var(--primary)/0.14),transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(80%_60%_at_30%_20%,black,transparent)] bg-[linear-gradient(to_right,hsl(var(--border)/0.45)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.45)_1px,transparent_1px)] bg-[size:48px_48px]"
          />

          <div className="relative flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              TP
            </div>
            <span className="text-lg font-semibold tracking-tight">TradePilot</span>
          </div>

          <div className="relative space-y-8">
            <div className="space-y-4">
              <h1 className="max-w-md text-balance text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
                Your AI sales agent for B2B export outreach.
              </h1>
              <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
                Find buyers, send personalized cold emails that land in the inbox, and let Autopilot
                follow up — all from one place.
              </p>
            </div>
            <ul className="space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-foreground/90">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-muted-foreground">© TradePilot · Made for export teams</p>
        </div>

        {/* Auth form column */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              TP
            </div>
            <span className="text-base font-semibold tracking-tight">TradePilot</span>
          </div>
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}
