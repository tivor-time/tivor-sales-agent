import { TrendingUp, Users, ShieldCheck, FileText, Mail, Upload, Send, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'

const KPIS = [
  {
    label: 'Pipeline value',
    value: '—',
    note: 'No data yet',
    icon: TrendingUp,
    dot: 'bg-muted-foreground/40',
  },
  {
    label: 'Active leads',
    value: '—',
    note: 'Import leads to begin',
    icon: Users,
    dot: 'bg-muted-foreground/40',
  },
  {
    label: 'Deliverability',
    value: 'Via Gmail',
    note: 'Sent through your mailbox',
    icon: ShieldCheck,
    dot: 'bg-success',
  },
  {
    label: 'Latest brief',
    value: 'None yet',
    note: 'Weekly briefs coming soon',
    icon: FileText,
    dot: 'bg-muted-foreground/40',
  },
]

const STEPS = [
  {
    step: '01',
    label: 'Connect Gmail',
    description: 'Link your mailbox to send and receive.',
    icon: Mail,
    href: '/settings',
  },
  {
    step: '02',
    label: 'Import leads',
    description: 'Bring in the buyers you want to reach.',
    icon: Upload,
    href: '/leads',
  },
  {
    step: '03',
    label: 'Launch a campaign',
    description: 'Let the agent draft and send outreach.',
    icon: Send,
    href: '/campaigns',
  },
]

export default function DashboardPage() {
  return (
    <PageContainer>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Pipeline health, deliverability, and your latest market brief.
        </p>
      </div>

      <DegradedBanner />

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pipeline overview
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => {
            const Icon = k.icon
            return (
              <Card key={k.label} className="p-5 hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-0">
                  <div className="flex items-start justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {k.label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-2xl font-semibold tracking-tight tabular-nums">
                      {k.value}
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${k.dot}`}
                        aria-hidden
                      />
                      {k.note}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Getting started
        </p>
        <Card className="p-2">
          <CardContent className="grid gap-1 p-0 sm:grid-cols-3">
            {STEPS.map((s) => {
              const Icon = s.icon
              return (
                <a
                  key={s.step}
                  href={s.href}
                  className="group flex items-start gap-3 rounded-lg p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium tabular-nums text-muted-foreground/70">
                        {s.step}
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">
                        {s.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </a>
              )
            })}
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  )
}
