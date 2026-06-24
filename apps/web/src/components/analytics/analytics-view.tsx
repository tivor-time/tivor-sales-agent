'use client'

import { useMemo, useState } from 'react'
import {
  BarChart3,
  Database,
  Users,
  Send,
  Inbox,
  ListTodo,
  MessageSquareReply,
  type LucideIcon,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useAnalyticsReport } from '@/lib/query/analytics'
import type { AnalyticsRangeDays } from '@/server/analytics/actions'
import { EmptyState } from '@/components/empty-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  chartColor,
  ChartTooltip,
  ChartLegend,
  ChartGradients,
  axisProps,
  gridProps,
  tooltipCursor,
} from '@/components/charts/chart'

const RANGES: AnalyticsRangeDays[] = [7, 30, 90]

function prettyLabel(v: string): string {
  return v
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function shortDate(isoDay: string): string {
  const [, month, day] = isoDay.split('-')
  return `${month}/${day}`
}

function formatInt(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

/** Clean segmented control for the 7 / 30 / 90 day range. */
function RangeToggle({
  value,
  onChange,
}: {
  value: AnalyticsRangeDays
  onChange: (d: AnalyticsRangeDays) => void
}) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex items-center rounded-lg border bg-muted/40 p-1"
    >
      {RANGES.map((d) => {
        const active = value === d
        return (
          <button
            key={d}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(d)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {d}d
          </button>
        )
      })}
    </div>
  )
}

/** Per-metric icon tints — token-based (chart palette), adapt to light/dark. */
const STAT_TINTS = [
  'bg-chart-1/10 text-chart-1',
  'bg-chart-2/10 text-chart-2',
  'bg-chart-3/10 text-chart-3',
  'bg-chart-4/10 text-chart-4',
  'bg-chart-5/10 text-chart-5',
  'bg-chart-6/10 text-chart-6',
] as const

/** Premium stat card: tinted icon square, big value, muted label. */
function StatCard({
  icon: Icon,
  label,
  value,
  tintIndex,
}: {
  icon: LucideIcon
  label: string
  value: string
  tintIndex: number
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span
          aria-hidden
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
            STAT_TINTS[tintIndex % STAT_TINTS.length],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </Card>
  )
}

/** Chart panel header with consistent typography. */
function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="space-y-1 p-5 pb-0">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-4">{children}</CardContent>
    </Card>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="grid h-72 place-items-center text-sm text-muted-foreground">{message}</div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

export function AnalyticsView() {
  const [rangeDays, setRangeDays] = useState<AnalyticsRangeDays>(30)
  const { data, isLoading, isError, error } = useAnalyticsReport(rangeDays)
  const code = (error as { code?: string } | null)?.code

  const funnelData = useMemo(() => {
    if (!data) return []
    return [
      { name: 'Pending approval', value: data.outreachFunnel.pendingApproval },
      { name: 'Queued / scheduled', value: data.outreachFunnel.queuedOrScheduled },
      { name: 'Sent / delivered', value: data.outreachFunnel.sentOrDelivered },
      { name: 'Failed / bounced', value: data.outreachFunnel.bouncedFailedSuppressed },
      { name: 'Triaged inquiries', value: data.outreachFunnel.inquiriesTriaged },
    ]
  }, [data])

  const intentData = useMemo(
    () =>
      (data?.inquiryIntentBreakdown ?? []).map((x) => ({
        name: prettyLabel(x.intent),
        value: x.count,
      })),
    [data],
  )

  const leadStageData = useMemo(
    () =>
      (data?.leadStageBreakdown ?? []).map((x) => ({
        name: prettyLabel(x.stage),
        value: x.count,
      })),
    [data],
  )

  const followUpStatusData = useMemo(
    () =>
      (data?.followUpStatusBreakdown ?? []).map((x) => ({
        name: prettyLabel(x.status),
        value: x.count,
      })),
    [data],
  )

  if (code === 'DB_UNAVAILABLE') {
    return (
      <EmptyState
        icon={Database}
        title="Connect a database to view analytics"
        description="Set DATABASE_URL and run migrations. This dashboard only renders real tenant outreach data."
      />
    )
  }

  if (isLoading) return <AnalyticsSkeleton />
  if (isError || !data) {
    return <EmptyState title="Couldn't load analytics" description={(error as Error)?.message} />
  }

  const hasData =
    data.kpis.leadsAdded +
      data.kpis.outboundSent +
      data.kpis.inboundInquiries +
      data.kpis.openFollowUps +
      leadStageData.length +
      followUpStatusData.length >
    0

  if (!hasData) {
    return (
      <div className="space-y-6">
        <RangeToggle value={rangeDays} onChange={setRangeDays} />
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Once leads are imported and outreach runs, this cockpit will show trends, funnel health, and response quality."
        />
      </div>
    )
  }

  const kpis: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Users, label: 'Leads Added', value: formatInt(data.kpis.leadsAdded) },
    { icon: Send, label: 'Outbound Sent', value: formatInt(data.kpis.outboundSent) },
    { icon: Inbox, label: 'Inbound Inquiries', value: formatInt(data.kpis.inboundInquiries) },
    { icon: ListTodo, label: 'Open Follow-ups', value: formatInt(data.kpis.openFollowUps) },
    { icon: MessageSquareReply, label: 'Inquiry Rate', value: formatPct(data.kpis.replyRate) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reporting window
        </p>
        <RangeToggle value={rangeDays} onChange={setRangeDays} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi, i) => (
          <StatCard
            key={kpi.label}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            tintIndex={i}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Daily Outreach Activity"
          description="Sent emails vs inbound mail vs created inquiries."
        >
          <ResponsiveContainer width="100%" height={288}>
            <AreaChart data={data.timeseries} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <ChartGradients />
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={20} {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip
                cursor={tooltipCursor}
                content={<ChartTooltip valueFormatter={(v) => formatInt(Number(v))} />}
              />
              <Legend content={<ChartLegend />} />
              <Area
                type="monotone"
                dataKey="outboundSent"
                name="Outbound sent"
                stroke={chartColor(0)}
                strokeWidth={2}
                fill="url(#chart-grad-0)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="inboundReceived"
                name="Inbound received"
                stroke={chartColor(1)}
                strokeWidth={2}
                fill="url(#chart-grad-1)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="inquiriesCreated"
                name="Inquiries"
                stroke={chartColor(2)}
                strokeWidth={2}
                fill="url(#chart-grad-2)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Outreach Funnel"
          description="Current-period movement from draft approval to triage."
        >
          <ResponsiveContainer width="100%" height={288}>
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
              barCategoryGap="28%"
            >
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis type="category" dataKey="name" width={130} {...axisProps} />
              <Tooltip
                cursor={tooltipCursor}
                content={
                  <ChartTooltip
                    hideLabel
                    valueFormatter={(v) => formatInt(Number(v))}
                  />
                }
              />
              <Bar dataKey="value" name="Count" fill={chartColor(0)} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Inquiry Intent Mix"
          description="What buyers are asking for most in the selected range."
        >
          {intentData.length === 0 ? (
            <ChartEmpty message="No inquiry intents in this period." />
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <PieChart>
                <Tooltip
                  cursor={false}
                  content={<ChartTooltip valueFormatter={(v) => formatInt(Number(v))} />}
                />
                <Legend content={<ChartLegend />} />
                <Pie
                  data={intentData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={104}
                  paddingAngle={2}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {intentData.map((entry, i) => (
                    <Cell key={`${entry.name}-${i}`} fill={chartColor(i)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Lead Stage Distribution"
          description="Snapshot of where current leads sit in your pipeline."
        >
          {leadStageData.length === 0 ? (
            <ChartEmpty message="No staged leads yet." />
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart
                data={leadStageData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" allowDecimals={false} {...axisProps} />
                <YAxis type="category" dataKey="name" width={115} {...axisProps} />
                <Tooltip
                  cursor={tooltipCursor}
                  content={
                    <ChartTooltip hideLabel valueFormatter={(v) => formatInt(Number(v))} />
                  }
                />
                <Bar dataKey="value" name="Leads" fill={chartColor(0)} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Follow-up Status Snapshot"
        description="Open and completed follow-up workload distribution across the workspace."
      >
        {followUpStatusData.length === 0 ? (
          <ChartEmpty message="No follow-up tasks yet." />
        ) : (
          <ResponsiveContainer width="100%" height={272}>
            <BarChart
              data={followUpStatusData}
              margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
              barCategoryGap="32%"
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="name"
                tickFormatter={(v) => String(v).replace('In Progress', 'In Prog')}
                interval={0}
                {...axisProps}
              />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip
                cursor={tooltipCursor}
                content={<ChartTooltip valueFormatter={(v) => formatInt(Number(v))} />}
              />
              <Bar dataKey="value" name="Tasks" fill={chartColor(0)} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}
