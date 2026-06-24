'use client'

import Link from 'next/link'
import { ArrowLeft, Globe, Mail, MapPin, Database, History, User, Building2, Target, Users } from 'lucide-react'
import { useLead, useUpdateLeadStage } from '@/lib/query/leads'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { IconTile, SectionHeading } from '@/components/ui/stat'
import { cn } from '@/lib/utils'
import { IcpScore, StageDot, StagePill, LEAD_STAGES, STAGE_LABELS } from './stage'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}

export function LeadDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error } = useLead(id)
  const updateStage = useUpdateLeadStage()
  const code = (error as { code?: string } | null)?.code

  if (code === 'DB_UNAVAILABLE') {
    return (
      <EmptyState
        icon={Database}
        title="Connect a database"
        description="Set DATABASE_URL to view lead details."
      />
    )
  }
  if (code === 'NOT_FOUND') {
    return <EmptyState title="Lead not found" description="This lead may have been removed." />
  }
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl lg:col-span-2" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }
  if (isError || !data) {
    return <EmptyState title="Couldn’t load lead" description={(error as Error)?.message} />
  }

  const { lead, contacts, activity } = data
  const reasons = Array.isArray((lead.enrichment as { icpReasons?: unknown }).icpReasons)
    ? ((lead.enrichment as { icpReasons: string[] }).icpReasons ?? [])
    : []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <IconTile icon={Building2} tone="primary" size="lg" className="mt-0.5" />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">{lead.companyName}</h1>
              <StagePill stage={lead.stage} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <Globe className="h-3.5 w-3.5" /> {lead.domain ?? lead.website}
                </a>
              )}
              {(lead.city || lead.country) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {[lead.city, lead.country].filter(Boolean).join(', ')}
                </span>
              )}
              <Badge variant="outline" className="font-normal">
                {lead.source}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Stage</SectionLabel>
          <div className="relative inline-flex items-center">
            <StageDot stage={lead.stage} className="pointer-events-none absolute left-3" />
            <select
              className="h-10 rounded-md border border-input bg-background pl-7 pr-3 text-sm font-medium ring-offset-background transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              value={lead.stage}
              onChange={(e) => updateStage.mutate({ id: lead.id, stage: e.target.value as never })}
              aria-label="Lead stage"
            >
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ICP */}
        <Card>
          <CardHeader>
            <SectionHeading icon={Target} iconTone="primary">
              ICP score
            </SectionHeading>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
                {lead.icpScore ?? '—'}
              </div>
              {lead.icpScore != null && (
                <span className="pb-1.5 font-mono text-sm tabular-nums text-muted-foreground">
                  / 100
                </span>
              )}
            </div>
            <IcpScore score={lead.icpScore} />
            {reasons.length > 0 && (
              <ul className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                {reasons.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionHeading
              icon={Users}
              iconTone="sky"
              action={
                <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-muted-foreground">
                  {contacts.length}
                </span>
              }
            >
              Contacts
            </SectionHeading>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {contacts.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                          <span className="truncate">
                            {[c.firstName, c.lastName].filter(Boolean).join(' ') ||
                              c.email ||
                              'Unknown'}
                          </span>
                          {c.isPrimary && <Badge variant="secondary">Primary</Badge>}
                          {c.consent?.optedOut && <Badge variant="destructive">Opted out</Badge>}
                        </div>
                        {c.title && (
                          <div className="truncate text-xs text-muted-foreground">{c.title}</div>
                        )}
                      </div>
                    </div>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{c.email}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <SectionHeading icon={History} iconTone="violet">
            Activity
          </SectionHeading>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-border">
              {activity.map((a) => (
                <li key={a.id} className="relative flex gap-3 text-sm">
                  <span
                    className={cn(
                      'relative z-10 mt-1 h-[7px] w-[7px] shrink-0 rounded-full bg-primary ring-4 ring-card',
                    )}
                  />
                  <div className="space-y-0.5 pb-0.5">
                    <div className="text-foreground">{a.summary}</div>
                    <div className="font-mono text-xs tabular-nums text-muted-foreground">
                      {new Date(a.at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
