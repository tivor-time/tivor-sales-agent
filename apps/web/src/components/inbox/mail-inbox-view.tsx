'use client'

import { useState } from 'react'
import { ArrowLeft, Database, Inbox, Mail, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/loading-skeleton'
import { useInbox, useInboxMessage } from '@/lib/query/inbox'
import { useSyncInbox } from '@/lib/query/mailboxes'
import type { InboxListItem } from '@/server/inbox/actions'

function prettyIntent(intent: string): string {
  return intent
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function formatWhen(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

function senderName(addr: string | null): string {
  if (!addr) return 'Unknown sender'
  const m = addr.match(/^\s*"?([^"<]+?)"?\s*<.*>$/)
  return (m?.[1] ?? addr).trim()
}

function IntentBadge({ intent, icpScore }: { intent: string | null; icpScore: number | null }) {
  if (!intent) return null
  return (
    <Badge variant="secondary" className="gap-1">
      <Sparkles className="h-3 w-3" />
      {prettyIntent(intent)}
      {typeof icpScore === 'number' ? ` · ICP ${icpScore}` : ''}
    </Badge>
  )
}

function MessageRow({
  item,
  active,
  onClick,
}: {
  item: InboxListItem
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full space-y-1 border-b px-4 py-3 text-left transition-colors',
        active ? 'bg-primary/10' : 'hover:bg-muted/50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{senderName(item.fromAddress)}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(item.receivedAt)}</span>
      </div>
      <p className="truncate text-sm">{item.subject || '(No subject)'}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{item.snippet || ' '}</p>
      {item.intent ? (
        <div className="pt-0.5">
          <IntentBadge intent={item.intent} icpScore={item.icpScore} />
        </div>
      ) : null}
    </button>
  )
}

function ReadingPane({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading, isError, error } = useInboxMessage(id)

  if (isLoading) {
    return (
      <div className="p-6">
        <TableSkeleton rows={6} cols={1} />
      </div>
    )
  }
  if (isError || !data) {
    return <EmptyState title="Couldn't open message" description={(error as Error)?.message} />
  }

  const bant = [
    ['Budget', data.budget],
    ['Authority', data.authority],
    ['Need', data.need],
    ['Timeline', data.timeline],
  ].filter(([, v]) => !!v) as [string, string][]

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-4">
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-tight">{data.subject || '(No subject)'}</h2>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">{senderName(data.fromAddress)}</span>{' '}
            {data.fromAddress ? `<${data.fromAddress}>` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            to {data.toAddress || 'you'} · {formatWhen(data.receivedAt)}
          </p>
        </div>
        {data.intent ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
            <IntentBadge intent={data.intent} icpScore={data.icpScore} />
            {data.status ? <Badge variant="outline">{data.status}</Badge> : null}
            {bant.map(([k, v]) => (
              <span key={k} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{k}:</span> {v}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        {data.bodyHtml ? (
          <iframe
            title="Email content"
            sandbox=""
            className="h-full w-full bg-white"
            srcDoc={data.bodyHtml}
          />
        ) : (
          <div className="h-full overflow-auto whitespace-pre-wrap p-4 text-sm">
            {data.bodyText || 'No content.'}
          </div>
        )}
      </div>
    </div>
  )
}

export function MailInboxView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data, isLoading, isError, error } = useInbox()
  const sync = useSyncInbox()
  const code = (error as { code?: string } | null)?.code
  const rows = data ?? []

  const list = (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">All mail</span>
          {rows.length > 0 ? (
            <span className="text-xs text-muted-foreground">({rows.length})</span>
          ) : null}
        </div>
        <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
          <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} />
          {sync.isPending ? 'Syncing...' : 'Sync'}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {code === 'DB_UNAVAILABLE' ? (
          <EmptyState
            icon={Database}
            title="Connect a database"
            description="Set DATABASE_URL to load your inbox."
          />
        ) : isLoading ? (
          <TableSkeleton rows={8} cols={1} />
        ) : isError ? (
          <EmptyState title="Couldn't load inbox" description={(error as Error)?.message} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No mail yet"
            description="Connect Gmail in Settings, then hit Sync to pull your inbox."
          />
        ) : (
          rows.map((item) => (
            <MessageRow
              key={item.id}
              item={item}
              active={item.id === selectedId}
              onClick={() => setSelectedId(item.id)}
            />
          ))
        )}
      </div>
    </div>
  )

  const reader = (
    <div className="h-full rounded-lg border bg-card">
      {selectedId ? (
        <ReadingPane id={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <EmptyState
          icon={Mail}
          title="Select a message"
          description="Pick an email on the left to read it here."
        />
      )}
    </div>
  )

  return (
    <div className="grid h-[calc(100vh-13rem)] gap-4 lg:grid-cols-[380px_1fr]">
      <div className={cn('min-h-0', selectedId && 'hidden lg:block')}>{list}</div>
      <div className={cn('min-h-0', !selectedId && 'hidden lg:block')}>{reader}</div>
    </div>
  )
}
