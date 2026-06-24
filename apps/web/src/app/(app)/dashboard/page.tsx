import { TrendingUp, Users, ShieldCheck, FileText, Mail, Upload, Send, ArrowRight, Rocket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard, IconTile, SectionHeading, StatusDot, type StatTone } from '@/components/ui/stat'
import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'

type Kpi = {
  label: string
  value: string
  note: string
  icon: typeof TrendingUp
  tone: StatTone
  /** Only Deliverability has a real (success) status; others are placeholder-muted. */
  dotTone: StatTone
}

const KPIS: Kpi[] = [
  {
    label: 'Pipeline value',
    value: '—',
    note: 'No data yet',
    icon: TrendingUp,
    tone: 'primary',
    dotTone: 'muted',
  },
  {
    label: 'Active leads',
    value: '—',
    note: 'Import leads to begin',
    icon: Users,
    tone: 'sky',
    dotTone: 'muted',
  },
  {
    label: 'Deliverability',
    value: 'Via Gmail',
    note: 'Sent through your mailbox',
    icon: ShieldCheck,
    tone: 'success',
    dotTone: 'success',
  },
  {
    label: 'Latest brief',
    value: 'None yet',
    note: 'Weekly briefs coming soon',
    icon: FileText,
    tone: 'violet',
    dotTone: 'muted',
  },
]

const STEPS = [
  {
    step: '01',
    label: 'Connect Gmail',
    description: 'Link your mailbox to send and receive.',
    icon: Mail,
    tone: 'primary' as StatTone,
    href: '/settings',
  },
  {
    step: '02',
    label: 'Import leads',
    description: 'Bring in the buyers you want to reach.',
    icon: Upload,
    tone: 'sky' as StatTone,
    href: '/leads',
  },
  {
    step: '03',
    label: 'Launch a campaign',
    description: 'Let the agent draft and send outreach.',
    icon: Send,
    tone: 'success' as StatTone,
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
        <SectionHeading icon={TrendingUp}>Pipeline overview</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => (
            <StatCard
              key={k.label}
              icon={k.icon}
              tone={k.tone}
              label={k.label}
              value={k.value}
              footer={
                <span className="flex items-center gap-1.5">
                  <StatusDot tone={k.dotTone} className="shrink-0" />
                  {k.note}
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={Rocket} iconTone="success">
          Getting started
        </SectionHeading>
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
                  <IconTile icon={Icon} tone={s.tone} className="mt-0.5" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-medium tabular-nums text-muted-foreground/70">
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
