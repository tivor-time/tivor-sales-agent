'use client'

import { useMemo } from 'react'
import { ClipboardCheck, Database, CheckCheck, Building2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
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
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              <span className="tabular-nums">{all.length}</span> draft
              {all.length === 1 ? '' : 's'} awaiting approval
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Across <span className="tabular-nums">{groups.length}</span> lead
              {groups.length === 1 ? '' : 's'} · nothing sends until you approve.
            </p>
          </div>
        </div>
        <Button onClick={() => bulk.mutate({ ids: allIds })} disabled={bulk.isPending}>
          <CheckCheck className="h-4 w-4" /> Approve all
          <span className="tabular-nums">({all.length})</span>
        </Button>
      </div>

      {/* Grouped drafts */}
      {groups.map(([company, drafts]) => (
        <section key={company} className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{company}</h2>
            <Badge variant="secondary" className="tabular-nums">
              {drafts.length}
            </Badge>
          </div>
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
