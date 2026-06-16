'use client'

import Link from 'next/link'
import { ArrowLeft, Globe, Mail, MapPin, Database, History, User } from 'lucide-react'
import { useLead, useUpdateLeadStage } from '@/lib/query/leads'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { IcpScore, LEAD_STAGES, STAGE_LABELS } from './stage'

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
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-lg" />
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
    <div className="space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{lead.companyName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {lead.website && (
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" /> {lead.domain ?? lead.website}
              </a>
            )}
            {(lead.city || lead.country) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[lead.city, lead.country].filter(Boolean).join(', ')}
              </span>
            )}
            <Badge variant="outline">{lead.source}</Badge>
          </div>
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ICP */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">ICP score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold tabular-nums">{lead.icpScore ?? '—'}</div>
            <IcpScore score={lead.icpScore} />
            {reasons.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {reasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contacts ({contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              <ul className="divide-y">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unknown'}
                          {c.isPrimary && (
                            <Badge variant="secondary" className="ml-2">
                              Primary
                            </Badge>
                          )}
                          {c.consent?.optedOut && (
                            <Badge variant="destructive" className="ml-2">
                              Opted out
                            </Badge>
                          )}
                        </div>
                        {c.title && <div className="text-xs text-muted-foreground">{c.title}</div>}
                      </div>
                    </div>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3.5 w-3.5" /> {c.email}
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
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="h-4 w-4" /> Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div>{a.summary}</div>
                    <div className="text-xs text-muted-foreground">
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
