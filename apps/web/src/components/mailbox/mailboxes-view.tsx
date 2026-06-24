'use client'

import { useEffect } from 'react'
import { Database, Mail, Plug, RefreshCw, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFlags } from '@/lib/flags-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/empty-state'
import { ListSkeleton } from '@/components/loading-skeleton'
import { queryKeys } from '@/lib/query/keys'
import type { MailboxDTO } from '@/server/mailbox/dto'
import {
  useDisconnectMailbox,
  useMailboxes,
  useSetMailboxSending,
  useSyncInbox,
} from '@/lib/query/mailboxes'

const PROVIDER_LABEL: Record<MailboxDTO['provider'], string> = {
  gmail: 'Gmail',
  microsoft: 'Microsoft 365',
  smtp: 'IMAP / SMTP',
  resend: 'Resend',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  )
}

const UNIPILE_PERKS = [
  'No DNS, SPF, or DKIM setup',
  'Sending turns on automatically',
  'Inbox sync included',
]

function UnipileConnectCard({
  enabled,
  missing,
  compact = false,
}: {
  enabled: boolean
  missing: string
  compact?: boolean
}) {
  // Slim "add another" affordance shown once at least one mailbox is connected,
  // so the connected list stays primary and the page doesn't read as "nothing happened".
  if (compact) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Plug className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Connect another mailbox</p>
              <p className="truncate text-xs text-muted-foreground">
                Add more Gmail, Microsoft 365, or IMAP accounts.
              </p>
            </div>
          </div>
          <Button asChild={enabled} variant="outline" size="sm" disabled={!enabled}>
            {enabled ? (
              <a href="/api/oauth/unipile/start">
                <Plug className="h-4 w-4" /> Connect
              </a>
            ) : (
              <>
                <Plug className="h-4 w-4" /> Connect
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="border-primary/30 bg-primary/[0.04]">
      <CardHeader className="flex-row items-start gap-3.5 space-y-0 p-5 sm:p-6">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Zap className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Connect Gmail</CardTitle>
            <Badge className="gap-1">
              <Sparkles className="h-3 w-3" /> One click
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gmail, Microsoft 365, or IMAP — authenticated through your provider. No deliverability
            setup required.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {UNIPILE_PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              {perk}
            </li>
          ))}
        </ul>
        {enabled ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href="/api/oauth/unipile/start">
              <Plug className="h-4 w-4" /> Connect mailbox
            </a>
          </Button>
        ) : (
          <div className="space-y-2">
            <Button size="lg" className="w-full sm:w-auto" disabled>
              <Plug className="h-4 w-4" /> Connect mailbox
            </Button>
            <p className="text-xs text-muted-foreground">
              Set <span className="font-medium text-foreground/70">{missing}</span> to enable.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ConnectCard({
  provider,
  enabled,
  missing,
}: {
  provider: 'gmail' | 'microsoft'
  enabled: boolean
  missing: string
}) {
  const label = provider === 'gmail' ? 'Gmail' : 'Microsoft 365'
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0 p-5 pb-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Mail className="h-4 w-4" />
        </div>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-5 pt-0">
        {enabled ? (
          <Button asChild variant="outline" className="w-full">
            <a href={`/api/oauth/${provider}/start`}>
              <Plug className="h-4 w-4" /> Connect {label}
            </a>
          </Button>
        ) : (
          <>
            <Button variant="outline" className="w-full" disabled>
              <Plug className="h-4 w-4" /> Connect {label}
            </Button>
            <p className="text-xs text-muted-foreground">
              Set <span className="font-medium text-foreground/70">{missing}</span> to enable.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MailboxCard({ m }: { m: MailboxDTO }) {
  const setSending = useSetMailboxSending()
  const disconnect = useDisconnectMailbox()

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-5 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="truncate text-base">{m.email}</CardTitle>
            <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <span>{PROVIDER_LABEL[m.provider]}</span>
              {m.connectedViaUnipile ? (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Sparkles className="h-3 w-3" /> one-click
                  </span>
                </>
              ) : null}
              {m.displayName ? (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="truncate">{m.displayName}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <Badge variant={m.sendingEnabled ? 'success' : 'secondary'} className="shrink-0 gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              m.sendingEnabled ? 'bg-success-foreground' : 'bg-muted-foreground/60',
            )}
          />
          {m.sendingEnabled ? 'Sending on' : 'Sending off'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Sent today{' '}
            <span className="font-medium tabular-nums text-foreground">{m.sentToday}</span>
            <span className="text-muted-foreground/60"> / {m.dailyCap}</span>
          </span>
          {m.warmupState ? (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="capitalize">Warmup: {m.warmupState}</span>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={m.sendingEnabled ? 'outline' : 'default'}
            onClick={() => setSending.mutate({ id: m.id, enabled: !m.sendingEnabled })}
            disabled={setSending.isPending}
          >
            {m.sendingEnabled ? 'Pause sending' : 'Enable sending'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              if (confirm('Disconnect this mailbox? Queued sends from it will stop.')) {
                disconnect.mutate({ id: m.id })
              }
            }}
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function MailboxesView() {
  const flags = useFlags()
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useMailboxes()
  const sync = useSyncInbox()
  const code = (error as { code?: string } | null)?.code
  const rows = data ?? []
  const secret = flags.isSecretStorageEnabled

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('mailbox')
    if (status === 'connected') {
      toast.success('Mailbox connected — sending and inbox sync are on.')
      // The OAuth callback redirects back here; force a refetch so the newly
      // connected mailbox (and its inbox/activity) shows immediately, even if this
      // tab held a stale empty list from before the connect.
      qc.invalidateQueries({ queryKey: queryKeys.mailboxes.all })
      qc.invalidateQueries({ queryKey: queryKeys.inbox.all })
      qc.invalidateQueries({ queryKey: queryKeys.outreach.activity })
    } else if (status === 'error') {
      toast.error('Could not connect the mailbox. Please try again.')
    }
    if (status) window.history.replaceState(null, '', window.location.pathname)
  }, [qc])

  const connectEnabled = flags.isUnipileEnabled && secret
  const connectMissing = !secret
    ? 'MASTER_ENCRYPTION_KEY, UNIPILE_DSN, UNIPILE_API_KEY, UNIPILE_WEBHOOK_SECRET'
    : 'UNIPILE_DSN, UNIPILE_API_KEY, UNIPILE_WEBHOOK_SECRET'

  // No DB / loading / error take over the whole surface.
  if (code === 'DB_UNAVAILABLE') {
    return (
      <EmptyState
        icon={Database}
        title="Connect a database first"
        description="Set DATABASE_URL and run migrations to store connected mailboxes."
      />
    )
  }
  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionLabel>Connected mailboxes</SectionLabel>
        <ListSkeleton rows={3} />
      </div>
    )
  }
  if (isError) {
    return <EmptyState title="Couldn't load mailboxes" description={(error as Error)?.message} />
  }

  // Once at least one mailbox is connected, lead with the connected list and demote
  // the connect CTA to a compact "add another" — so connecting visibly changes the page.
  if (rows.length > 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Connected mailboxes</SectionLabel>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
            >
              <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} />
              {sync.isPending ? 'Syncing...' : 'Sync inbox'}
            </Button>
          </div>
          <div className="space-y-3">
            {rows.map((m) => (
              <MailboxCard key={m.id} m={m} />
            ))}
          </div>
        </div>
        <UnipileConnectCard compact enabled={connectEnabled} missing={connectMissing} />
      </div>
    )
  }

  // Nothing connected yet → lead with the prominent connect hero.
  return (
    <div className="space-y-6">
      <UnipileConnectCard enabled={connectEnabled} missing={connectMissing} />

      {/* Direct provider OAuth is a fallback only. When Unipile is configured we hide
          it: running both connect paths on the same email silently clobbers the other's
          tokens/linkage. Unipile is the canonical path. */}
      {!flags.isUnipileEnabled && (
        <div className="space-y-3">
          <SectionLabel>Direct provider fallback</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConnectCard
              provider="gmail"
              enabled={flags.isGmailEnabled && secret}
              missing={
                !secret
                  ? 'MASTER_ENCRYPTION_KEY (and GMAIL_CLIENT_ID/SECRET/REDIRECT_URI)'
                  : 'GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI'
              }
            />
            <ConnectCard
              provider="microsoft"
              enabled={flags.isMsGraphEnabled && secret}
              missing={
                !secret
                  ? 'MASTER_ENCRYPTION_KEY (and MS_GRAPH_CLIENT_ID/SECRET/TENANT_ID/REDIRECT_URI)'
                  : 'MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID, MS_GRAPH_REDIRECT_URI'
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
