'use client'

import { useMemo } from 'react'
import { ClipboardCheck, Database, CheckCheck, Building2, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { IconTile, SectionHeading } from '@/components/ui/stat'
import { usePendingDrafts, useBulkApproveDrafts } from '@/lib/query/outreach'
import type { DraftMessageDTO } from '@/server/outreach/dto'
import { DraftCard } from './draft-card'

export function ApprovalQueue() {
  const { data, isLoading, isError, error } = usePendingDrafts()
  const bulk = useBulkApproveDrafts()
  const code = (error as { code?: string } | null)?.code

  const groups = useMemo(() => {
    const byLead = new Map<string, DraftMessageDTO[]>()
    for (const d of data ?? []) {
      const list = byLead.get(d.leadCompany) ?? []
      list.push(d)
      byLead.set(d.leadCompany, list)
    }
    for (const list of byLead.values()) list.sort((a, b) => a.stepOrder - b.stepOrder)
    return [...byLead.entries()]
  }, [data])

  const stats = useMemo(() => {
    const list = data ?? []
    return {
      ai: list.filter((d) => d.generatedByAi).length,
      atRisk: list.filter((d) => d.spamLevel !== 'low').length,
    }
  }, [data])

  if (code === 'DB_UNAVAILABLE') {
    return (
      <EmptyState
        icon={Database}
        title="Connect a database"
        description="Set DATABASE_URL to draft and review outreach."
      />
    )
  }
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }
  if (isError) {
    return <EmptyState title="Couldn’t load the approval queue" description={(error as Error)?.message} />
  }
  const all = data ?? []
  if (all.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Nothing to approve"
        description="Select leads on the Leads page and choose “Draft outreach” to generate a multilingual 4-step sequence here."
      />
    )
  }

  const allIds = all.map((d) => d.id)

  return (
    <div className="space-y-8">
      {/* Summary header */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <IconTile icon={ShieldCheck} tone="primary" size="lg" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                <span className="font-mono tabular-nums">{all.length}</span> draft
                {all.length === 1 ? '' : 's'} awaiting approval
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Across <span className="font-mono tabular-nums">{groups.length}</span> lead
                {groups.length === 1 ? '' : 's'} · nothing sends until you approve.
              </p>
            </div>
          </div>
          <Button onClick={() => bulk.mutate({ ids: allIds })} disabled={bulk.isPending}>
            <CheckCheck className="h-4 w-4" /> Approve all
            <span className="font-mono tabular-nums">({all.length})</span>
          </Button>
        </div>

        {/* Mini stat columns — real data only */}
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pending
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums tracking-tight text-foreground">
              {all.length}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              AI-drafted
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums tracking-tight text-foreground">
              {stats.ai}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-warning" />
              Spam risk
            </p>
            <p
              className={cn(
                'mt-1 font-mono text-lg font-bold tabular-nums tracking-tight',
                stats.atRisk > 0 ? 'text-warning' : 'text-foreground',
              )}
            >
              {stats.atRisk}
            </p>
          </div>
        </div>
      </div>

      {/* Grouped drafts */}
      {groups.map(([company, drafts]) => (
        <section key={company} className="space-y-3">
          <SectionHeading
            action={
              <Badge variant="secondary" className="font-mono tabular-nums">
                {drafts.length}
              </Badge>
            }
          >
            <IconTile icon={Building2} tone="muted" size="sm" className="-my-1" />
            <span className="tracking-tight text-foreground">{company}</span>
          </SectionHeading>
          <div className="grid gap-4">
            {drafts.map((d) => (
              <DraftCard key={d.id} draft={d} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
