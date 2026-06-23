'use client'

import { useMemo, useState } from 'react'
import { Inbox, Database, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/loading-skeleton'
import { cn } from '@/lib/utils'
import { useInquiries } from '@/lib/query/inquiries'
import {
  INQUIRY_INTENTS,
  INQUIRY_STATUSES,
  type InquiryIntent,
  type InquiryStatus,
  type ListInquiriesInput,
} from '@/server/inquiry/schemas'
import { InquiryDetail } from './inquiry-detail'

const INTENT_LABEL: Record<InquiryIntent, string> = {
  price_request: 'Price',
  sample_request: 'Sample',
  spec_request: 'Specs',
  moq_request: 'MOQ',
  certification_request: 'Certs',
  logistics_request: 'Logistics',
  partnership: 'Partnership',
  complaint: 'Complaint',
  unsubscribe: 'Unsubscribe',
  out_of_office: 'Out of office',
  not_interested: 'Not interested',
  other: 'Other',
}
const STATUS_LABEL: Record<InquiryStatus, string> = {
  open: 'Open',
  triaged: 'Triaged',
  responded: 'Responded',
  won: 'Won',
  lost: 'Lost',
  ignored: 'Ignored',
}

export function InboxView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [intent, setIntent] = useState<InquiryIntent[]>([])
  const [status, setStatus] = useState<InquiryStatus[]>([])

  const input: ListInquiriesInput = useMemo(
    () => ({ filters: { intent, status }, pagination: { page: 1, pageSize: 50 } }),
    [intent, status],
  )
  const { data, isLoading, isError, error } = useInquiries(input)
  const code = (error as { code?: string } | null)?.code
  const rows = data?.rows ?? []

  if (selectedId) return <InquiryDetail id={selectedId} onBack={() => setSelectedId(null)} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {INQUIRY_INTENTS.map((i) => (
          <button
            key={i}
            type="button"
            aria-pressed={intent.includes(i)}
            onClick={() =>
              setIntent((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
            }
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              intent.includes(i)
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {INTENT_LABEL[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {INQUIRY_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status.includes(s)}
            onClick={() =>
              setStatus((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
            }
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              status.includes(s)
                ? 'border-foreground bg-foreground/10'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {code === 'DB_UNAVAILABLE' ? (
        <EmptyState
          icon={Database}
          title="Connect a database"
          description="Set DATABASE_URL to store and triage inbound inquiries."
        />
      ) : isLoading ? (
        <TableSkeleton rows={6} cols={1} />
      ) : isError ? (
        <EmptyState title="Couldn’t load inquiries" description={(error as Error)?.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No inquiries yet"
          description="Connect a mailbox in Settings — buyer replies are classified and land here automatically."
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50"
            >
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{r.subject}</span>
                  <Badge variant="secondary">{INTENT_LABEL[r.intent]}</Badge>
                  <Badge variant="outline">{STATUS_LABEL[r.status]}</Badge>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.fromAddress ?? r.leadCompany ?? 'Unknown sender'} · {r.snippet}
                </div>
              </div>
              {r.icpScore != null && (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  ICP {r.icpScore}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
