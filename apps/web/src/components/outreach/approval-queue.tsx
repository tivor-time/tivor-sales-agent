'use client'

import { useMemo } from 'react'
import { ClipboardCheck, Database, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {all.length} draft{all.length === 1 ? '' : 's'} awaiting approval · {groups.length} lead
          {groups.length === 1 ? '' : 's'}. Nothing sends until approved (and sending stays off until
          domain auth verifies).
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => bulk.mutate({ ids: allIds })}
          disabled={bulk.isPending}
        >
          <CheckCheck className="h-4 w-4" /> Approve all ({all.length})
        </Button>
      </div>

      {groups.map(([company, drafts]) => (
        <div key={company} className="space-y-3">
          <h2 className="text-sm font-semibold">{company}</h2>
          <div className="grid gap-3">
            {drafts.map((d) => (
              <DraftCard key={d.id} draft={d} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
