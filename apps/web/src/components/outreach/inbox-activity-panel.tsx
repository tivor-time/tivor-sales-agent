'use client'

import { useMemo, useState } from 'react'
import { Database, FolderInput, Inbox, Send, ArrowRight, Clock, type LucideIcon } from 'lucide-react'
import type { OutreachActivityDTO, OutreachActivityItem } from '@/server/outreach/actions'
import { useOutreachActivity } from '@/lib/query/outreach'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ListSkeleton } from '@/components/loading-skeleton'
import { IconTile, type StatTone } from '@/components/ui/stat'

type ActivityTab = keyof OutreachActivityDTO

const TABS: Array<{ key: ActivityTab; label: string; icon: LucideIcon; tone: StatTone }> = [
  { key: 'received', label: 'Received', icon: Inbox, tone: 'sky' },
  { key: 'sent', label: 'Sent', icon: Send, tone: 'success' },
  { key: 'moved', label: 'Moved', icon: FolderInput, tone: 'violet' },
]

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

function renderMeta(row: OutreachActivityItem): string {
  if (row.folders.length > 0) return row.folders.join(' · ')
  if (row.status) return row.status
  return 'mail activity'
}

export function InboxActivityPanel() {
  const [tab, setTab] = useState<ActivityTab>('received')
  const { data, isLoading, isError, error } = useOutreachActivity()
  const rows = useMemo(() => data?.[tab] ?? [], [data, tab])
  const code = (error as { code?: string } | null)?.code
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="space-y-1.5">
          <CardTitle>Inbox activity</CardTitle>
          <CardDescription>
            Operational mailbox stream for outreach. Inquiry Inbox stays focused on triaged inbound
            only.
          </CardDescription>
        </div>
        <div
          role="tablist"
          aria-label="Mail activity"
          className="inline-flex rounded-lg border bg-muted/40 p-1"
        >
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent>
        {code === 'DB_UNAVAILABLE' ? (
          <EmptyState
            icon={Database}
            title="Connect a database"
            description="Set DATABASE_URL to power outreach mailbox activity."
          />
        ) : isLoading ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <EmptyState title="Couldn't load activity" description={(error as Error)?.message} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={activeTab.icon}
            title={`No ${tab} mail yet`}
            description="This section will fill automatically as webhook events arrive."
          />
        ) : (
          <div className="divide-y rounded-lg border">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <IconTile icon={activeTab.icon} tone={activeTab.tone} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {row.subject || '(No subject)'}
                    </p>
                    <Badge variant="secondary">
                      {row.source === 'provider' ? 'Provider' : 'App'}
                    </Badge>
                    {row.role ? <Badge variant="outline">{row.role}</Badge> : null}
                  </div>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate font-mono">{row.fromAddress || 'Unknown sender'}</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="truncate font-mono">
                      {row.toAddress || 'Unknown recipient'}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{renderMeta(row)}</span>
                    <span aria-hidden className="text-muted-foreground/40">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3 w-3" />
                      {formatWhen(row.occurredAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
