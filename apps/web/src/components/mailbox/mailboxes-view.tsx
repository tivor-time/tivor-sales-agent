'use client'

import { useEffect, useState } from 'react'
import { Mail, Database, Plug, Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useFlags } from '@/lib/flags-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/loading-skeleton'
import type { MailboxDTO } from '@/server/mailbox/dto'
import {
  useMailboxes,
  useDomainAuthRecords,
  useVerifyDomainAuth,
  useSetMailboxSending,
  useDisconnectMailbox,
} from '@/lib/query/mailboxes'

const PROVIDER_LABEL: Record<MailboxDTO['provider'], string> = {
  gmail: 'Gmail',
  microsoft: 'Microsoft 365',
  smtp: 'SMTP',
  resend: 'Resend',
}

function StatusBadge({ label, status }: { label: string; status: MailboxDTO['spfStatus'] }) {
  const variant = status === 'pass' ? 'success' : status === 'fail' ? 'destructive' : 'secondary'
  return (
    <Badge variant={variant}>
      {label}: {status}
    </Badge>
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
  const [showDns, setShowDns] = useState(false)
  const dns = useDomainAuthRecords(m.id, showDns)
  const verify = useVerifyDomainAuth()
  const setSending = useSetMailboxSending()
  const disconnect = useDisconnectMailbox()

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{m.email}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {PROVIDER_LABEL[m.provider]}
            {m.displayName ? ` · ${m.displayName}` : ''}
          </p>
        </div>
        <Badge variant={m.sendingEnabled ? 'success' : 'secondary'}>
          {m.sendingEnabled ? 'Sending on' : 'Sending off'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge label="SPF" status={m.spfStatus} />
          <StatusBadge label="DKIM" status={m.dkimStatus} />
          <StatusBadge label="DMARC" status={m.dmarcStatus} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => verify.mutate({ id: m.id })}
            disabled={verify.isPending}
          >
            <RefreshCw className="h-4 w-4" /> {verify.isPending ? 'Verifying…' : 'Verify domain'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDns((v) => !v)}>
            {showDns ? 'Hide DNS records' : 'Show DNS records'}
          </Button>
          <Button
            size="sm"
            variant={m.sendingEnabled ? 'outline' : 'default'}
            onClick={() => setSending.mutate({ id: m.id, enabled: !m.sendingEnabled })}
            disabled={(!m.domainVerifiedAt && !m.sendingEnabled) || setSending.isPending}
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

        {!m.domainVerifiedAt && (
          <p className="text-xs text-muted-foreground">
            Publish the DNS records below, then click <span className="font-medium">Verify domain</span>.
            Sending turns on automatically once SPF, DKIM, and DMARC all pass.
          </p>
        )}

        {showDns && (
          <div className="rounded-md border">
            {dns.isLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading records…</div>
            ) : dns.data && dns.data.length > 0 ? (
              <ul className="divide-y text-xs">
                {dns.data.map((r, i) => (
                  <li key={i} className="space-y-1 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">
                        {r.purpose}
                      </Badge>
                      <span className="text-muted-foreground">{r.type}</span>
                      <code className="rounded bg-muted px-1">{r.host}</code>
                      <button
                        type="button"
                        className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          void navigator.clipboard.writeText(r.value)
                          toast.success('Copied')
                        }}
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                    <code className="block break-all rounded bg-muted/60 p-2">{r.value}</code>
                    {r.note && <p className="text-muted-foreground">{r.note}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">No records to show.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MailboxesView() {
  const flags = useFlags()
  const { data, isLoading, isError, error } = useMailboxes()
  const code = (error as { code?: string } | null)?.code
  const rows = data ?? []
  const secret = flags.isSecretStorageEnabled

  // One-shot toast from the OAuth callback redirect (?mailbox=connected|error).
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('mailbox')
    if (status === 'connected') toast.success('Mailbox connected. Verify your domain to start sending.')
    else if (status === 'error') toast.error('Could not connect the mailbox. Please try again.')
    if (status) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  return (
    <div className="space-y-6">
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

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Connected mailboxes</h2>
        {code === 'DB_UNAVAILABLE' ? (
          <EmptyState
            icon={Database}
            title="Connect a database first"
            description="Set DATABASE_URL and run migrations to store connected mailboxes."
          />
        ) : isLoading ? (
          <TableSkeleton rows={3} cols={1} />
        ) : isError ? (
          <EmptyState title="Couldn’t load mailboxes" description={(error as Error)?.message} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No mailboxes connected"
            description="Connect Gmail or Microsoft 365 above to start sending."
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
