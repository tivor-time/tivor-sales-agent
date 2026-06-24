'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Database } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const RANGES: AnalyticsRangeDays[] = [7, 30, 90]

const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#e11d48', '#8b5cf6', '#0ea5e9']

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

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <Skeleton className="h-72 rounded-lg" />
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
      <div className="space-y-4">
        <div className="inline-flex rounded-lg border bg-muted/30 p-1">
          {RANGES.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={rangeDays === d ? 'default' : 'ghost'}
              onClick={() => setRangeDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Once leads are imported and outreach runs, this cockpit will show trends, funnel health, and response quality."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-muted/30 p-1">
        {RANGES.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={rangeDays === d ? 'default' : 'ghost'}
            onClick={() => setRangeDays(d)}
          >
            {d}d
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leads Added</CardDescription>
            <CardTitle className="text-2xl">{formatInt(data.kpis.leadsAdded)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outbound Sent</CardDescription>
            <CardTitle className="text-2xl">{formatInt(data.kpis.outboundSent)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inbound Inquiries</CardDescription>
            <CardTitle className="text-2xl">{formatInt(data.kpis.inboundInquiries)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Follow-ups</CardDescription>
            <CardTitle className="text-2xl">{formatInt(data.kpis.openFollowUps)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inquiry Rate</CardDescription>
            <CardTitle className="text-2xl">{formatPct(data.kpis.replyRate)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Outreach Activity</CardTitle>
            <CardDescription>Sent emails vs inbound mail vs created inquiries.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeseries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={20} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(v) => String(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="outboundSent"
                  name="Outbound sent"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="inboundReceived"
                  name="Inbound received"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="inquiriesCreated"
                  name="Inquiries"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outreach Funnel</CardTitle>
            <CardDescription>Current-period movement from draft approval to triage.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inquiry Intent Mix</CardTitle>
            <CardDescription>What buyers are asking for most in the selected range.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {intentData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                No inquiry intents in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={intentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={2}
                  >
                    {intentData.map((entry, i) => (
                      <Cell key={`${entry.name}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Stage Distribution</CardTitle>
            <CardDescription>Snapshot of where current leads sit in your pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {leadStageData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                No staged leads yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadStageData} layout="vertical" margin={{ left: 10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Leads" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up Status Snapshot</CardTitle>
          <CardDescription>
            Open and completed follow-up workload distribution across the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {followUpStatusData.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No follow-up tasks yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={followUpStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickFormatter={(v) => String(v).replace('In Progress', 'In Prog')}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Tasks" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
