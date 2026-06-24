'use client'

import { useEffect } from 'react'
import { Database, Mail, Plug, RefreshCw, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFlags } from '@/lib/flags-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/loading-skeleton'
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

function UnipileConnectCard({ enabled, missing }: { enabled: boolean; missing: string }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Connect Gmail — one click</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Gmail, Microsoft 365, or IMAP. Authenticated through your provider — no DNS, SPF, or DKIM
          setup needed. Sending and inbox sync turn on automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {enabled ? (
          <Button asChild className="w-full">
            <a href="/api/oauth/unipile/start">
              <Plug className="h-4 w-4" /> Connect mailbox
            </a>
          </Button>
        ) : (
          <>
            <Button className="w-full" disabled>
              <Plug className="h-4 w-4" /> Connect mailbox
            </Button>
            <p className="text-xs text-muted-foreground">Set {missing} to enable.</p>
          </>
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
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {enabled ? (
          <Button asChild className="w-full">
            <a href={`/api/oauth/${provider}/start`}>
              <Plug className="h-4 w-4" /> Connect {label}
            </a>
          </Button>
        ) : (
          <>
            <Button className="w-full" disabled>
              <Plug className="h-4 w-4" /> Connect {label}
            </Button>
            <p className="text-xs text-muted-foreground">Set {missing} to enable.</p>
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
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{m.email}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {PROVIDER_LABEL[m.provider]}
            {m.connectedViaUnipile ? ' · one-click' : ''}
            {m.displayName ? ` — ${m.displayName}` : ''}
          </p>
        </div>
        <Badge variant={m.sendingEnabled ? 'success' : 'secondary'}>
          {m.sendingEnabled ? 'Sending on' : 'Sending off'}
        </Badge>
      </CardHeader>
      <CardContent>
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
            className="ml-auto text-destructive"
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
  const { data, isLoading, isError, error } = useMailboxes()
  const sync = useSyncInbox()
  const code = (error as { code?: string } | null)?.code
  const rows = data ?? []
  const secret = flags.isSecretStorageEnabled

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('mailbox')
    if (status === 'connected') {
      toast.success('Mailbox connected — sending and inbox sync are on.')
    } else if (status === 'error') {
      toast.error('Could not connect the mailbox. Please try again.')
    }
    if (status) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  return (
    <div className="space-y-6">
      <UnipileConnectCard
        enabled={flags.isUnipileEnabled && secret}
        missing={
          !secret
            ? 'MASTER_ENCRYPTION_KEY, UNIPILE_DSN, UNIPILE_API_KEY, UNIPILE_WEBHOOK_SECRET'
            : 'UNIPILE_DSN, UNIPILE_API_KEY, UNIPILE_WEBHOOK_SECRET'
        }
      />

      {/* Direct provider OAuth is a fallback only. When Unipile is configured we hide
          it: running both connect paths on the same email silently clobbers the other's
          tokens/linkage. Unipile is the canonical path. */}
      {!flags.isUnipileEnabled && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Direct provider fallback</h2>
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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Connected mailboxes</h2>
          {rows.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
            >
              <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} />
              {sync.isPending ? 'Syncing...' : 'Sync inbox'}
            </Button>
          )}
        </div>
        {code === 'DB_UNAVAILABLE' ? (
          <EmptyState
            icon={Database}
            title="Connect a database first"
            description="Set DATABASE_URL and run migrations to store connected mailboxes."
          />
        ) : isLoading ? (
          <TableSkeleton rows={3} cols={1} />
        ) : isError ? (
          <EmptyState title="Couldn't load mailboxes" description={(error as Error)?.message} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No mailboxes connected"
            description="Connect Gmail above to start outbound send and inbox sync."
          />
        ) : (
          <div className="space-y-3">
            {rows.map((m) => (
              <MailboxCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
