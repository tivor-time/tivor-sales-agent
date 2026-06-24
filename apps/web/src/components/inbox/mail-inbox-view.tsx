'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Database, Inbox, Mail, Reply, Search, RefreshCw, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/empty-state'
import { ListSkeleton, ReadingPaneSkeleton } from '@/components/loading-skeleton'
import { useInbox, useInboxMessage, useReplyToInbound } from '@/lib/query/inbox'
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

function initials(name: string): string {
  const parts = name.replace(/[<>"]/g, '').trim().split(/[\s@.]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground',
        size === 'lg' ? 'h-10 w-10 text-sm' : 'h-9 w-9 text-xs',
      )}
    >
      {initials(name)}
    </div>
  )
}

function IntentChip({ intent, icpScore }: { intent: string; icpScore: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground/80">
      <Sparkles className="h-3 w-3 text-primary" />
      {prettyIntent(intent)}
      {typeof icpScore === 'number' ? (
        <span className="tabular-nums text-muted-foreground">· {icpScore}</span>
      ) : null}
    </span>
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
  const name = senderName(item.fromAddress)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      className={cn(
        'relative flex w-full items-start gap-3 border-b border-border/60 px-4 py-3.5 text-left transition-colors',
        active
          ? 'bg-accent before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary'
          : 'hover:bg-muted/50',
      )}
    >
      <Avatar name={name} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatWhen(item.receivedAt)}
          </span>
        </div>
        <p className="truncate text-sm text-foreground/90">{item.subject || '(No subject)'}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{item.snippet || ''}</p>
        {item.intent ? (
          <div className="pt-1">
            <IntentChip intent={item.intent} icpScore={item.icpScore} />
          </div>
        ) : null}
      </div>
    </button>
  )
}

function ReadingPane({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading, isError, error } = useInboxMessage(id)
  const reply = useReplyToInbound()
  const [replying, setReplying] = useState(false)
  const [replyBody, setReplyBody] = useState('')

  if (isLoading) {
    return <ReadingPaneSkeleton />
  }
  if (isError || !data) {
    return (
      <EmptyState
        title="Couldn't open message"
        description={(error as Error)?.message}
        bordered={false}
        className="h-full"
      />
    )
  }

  const fromName = senderName(data.fromAddress)
  const bant = (
    [
      ['Budget', data.budget],
      ['Authority', data.authority],
      ['Need', data.need],
      ['Timeline', data.timeline],
    ] as const
  ).filter(([, v]) => !!v) as [string, string][]

  const srcDoc = data.bodyHtml
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
        html,body{margin:0}
        body{font-family:-apple-system,'Segoe UI',Roboto,Inter,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#0b1220;background:#ffffff;padding:20px;word-break:break-word;-webkit-text-size-adjust:100%}
        img{max-width:100%;height:auto}a{color:#2540c0}table{max-width:100%!important}
        *{max-width:100%}
      </style></head><body>${data.bodyHtml}</body></html>`
    : ''

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 border-b border-border/70 px-5 py-5 sm:px-6">
        <Button variant="ghost" size="sm" className="-ml-2 lg:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
          {data.subject || '(No subject)'}
        </h2>
        <div className="flex items-center gap-3">
          <Avatar name={fromName} size="lg" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">
              {fromName}{' '}
              {data.fromAddress ? (
                <span className="font-normal text-muted-foreground">&lt;{data.fromAddress}&gt;</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              to {data.toAddress || 'you'} · {formatWhen(data.receivedAt)}
            </p>
          </div>
        </div>

        {data.intent ? (
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                AI insights
              </span>
              <IntentChip intent={data.intent} icpScore={data.icpScore} />
              {data.status ? (
                <Badge variant="outline" className="capitalize">
                  {data.status}
                </Badge>
              ) : null}
            </div>
            {bant.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {bant.map(([k, v]) => (
                  <div key={k} className="min-w-0 space-y-0.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {k}
                    </dt>
                    <dd className="truncate text-sm text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={replying ? 'outline' : 'default'}
            onClick={() => setReplying((v) => !v)}
          >
            <Reply className="h-4 w-4" /> Reply
          </Button>
        </div>

        {replying ? (
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reply to {fromName}
            </p>
            <Textarea
              autoFocus
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={5}
              placeholder={`Write your reply…`}
              className="resize-none bg-background"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplying(false)}
                disabled={reply.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={reply.isPending || !replyBody.trim()}
                onClick={() =>
                  reply.mutate(
                    { messageId: id, body: replyBody.trim() },
                    {
                      onSuccess: () => {
                        setReplyBody('')
                        setReplying(false)
                      },
                    },
                  )
                }
              >
                <Send className="h-4 w-4" /> {reply.isPending ? 'Sending…' : 'Send reply'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        {data.bodyHtml ? (
          <iframe title="Email content" sandbox="" className="h-full min-h-[320px] w-full" srcDoc={srcDoc} />
        ) : (
          <div className="whitespace-pre-wrap px-5 py-5 text-sm leading-relaxed text-foreground/90 sm:px-6">
            {data.bodyText || 'No content.'}
          </div>
        )}
      </div>
    </div>
  )
}

export function MailInboxView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const { data, isLoading, isError, error } = useInbox()
  const sync = useSyncInbox()
  const code = (error as { code?: string } | null)?.code
  const rows = data ?? []

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) =>
      [r.subject, r.fromAddress, r.snippet].some((f) => (f ?? '').toLowerCase().includes(term)),
    )
  }, [rows, q])

  const list = (
    <div className="flex h-full flex-col overflow-hidden border-r border-border/70">
      <div className="space-y-3 border-b border-border/70 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground">Inbox</h1>
            {rows.length > 0 ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {rows.length}
              </span>
            ) : null}
          </div>
          <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
            <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} />
            {sync.isPending ? 'Syncing' : 'Sync'}
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search mail"
            className="h-9 pl-9"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        {code === 'DB_UNAVAILABLE' ? (
          <EmptyState
            icon={Database}
            title="Connect a database"
            description="Set DATABASE_URL to load your inbox."
            bordered={false}
            className="h-full"
          />
        ) : isLoading ? (
          <ListSkeleton rows={8} framed={false} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load inbox"
            description={(error as Error)?.message}
            bordered={false}
            className="h-full"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No mail yet"
            description="Connect Gmail in Settings, then hit Sync to pull your inbox."
            bordered={false}
            className="h-full"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`Nothing matches “${q}”.`}
            bordered={false}
            className="h-full"
          />
        ) : (
          filtered.map((item) => (
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
    <div className="h-full overflow-hidden bg-background">
      {selectedId ? (
        <ReadingPane id={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <EmptyState
          icon={Mail}
          title="Select a message"
          description="Pick an email on the left to read it here."
          bordered={false}
          className="h-full"
        />
      )}
    </div>
  )

  return (
    <div className="grid h-full lg:grid-cols-[380px_1fr]">
      <div className={cn('min-h-0', selectedId && 'hidden lg:block')}>{list}</div>
      <div className={cn('min-h-0', !selectedId && 'hidden lg:block')}>{reader}</div>
    </div>
  )
}
