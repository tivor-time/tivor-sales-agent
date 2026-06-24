'use client'

import Link from 'next/link'
import { ArrowLeft, Mail, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { IconTile, SectionHeading } from '@/components/ui/stat'
import { EmptyState } from '@/components/empty-state'
import { useInquiry, useSetInquiryStatus } from '@/lib/query/inquiries'

export function InquiryDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading, isError, error } = useInquiry(id)
  const setStatus = useSetInquiryStatus()
  const code = (error as { code?: string } | null)?.code

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Back to inbox
      </Button>

      {code === 'DB_UNAVAILABLE' ? (
        <EmptyState title="Database not connected" />
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : isError || !data ? (
        <EmptyState title="Inquiry not found" description={(error as Error)?.message} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {data.message?.subject ?? '(no subject)'}
            </h2>
            <Badge variant="secondary" className="capitalize">
              {data.inquiry.intent}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {data.inquiry.status}
            </Badge>
            {data.lead && (
              <Button variant="link" size="sm" asChild className="ml-auto">
                <Link href={`/leads/${data.lead.id}`}>{data.lead.companyName} →</Link>
              </Button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader className="pb-3">
                <SectionHeading icon={Mail} iconTone="muted">
                  Message
                </SectionHeading>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  From{' '}
                  <span className="font-medium text-foreground">
                    {data.message?.fromAddress ?? 'unknown'}
                  </span>
                  {data.message?.receivedAt ? (
                    <>
                      {' · '}
                      <span className="font-mono tabular-nums">
                        {new Date(data.message.receivedAt).toLocaleString()}
                      </span>
                    </>
                  ) : null}
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90 scrollbar-thin">
                  {data.message?.bodyText || '(no content)'}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <SectionHeading icon={Sparkles} iconTone="primary">
                  AI classification
                </SectionHeading>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.inquiry.icpScore != null && (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                    <IconTile icon={Sparkles} tone="primary" size="lg" />
                    <div className="min-w-0">
                      <div className="font-mono text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground">
                        {data.inquiry.icpScore}
                      </div>
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        ICP score
                      </div>
                    </div>
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {(
                    [
                      ['Budget', data.inquiry.budget],
                      ['Authority', data.inquiry.authority],
                      ['Need', data.inquiry.need],
                      ['Timeline', data.inquiry.timeline],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="min-w-0 space-y-0.5">
                      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="text-sm text-foreground">{value ?? '—'}</dd>
                    </div>
                  ))}
                </dl>
                {data.inquiry.requestedProducts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Requested products
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.inquiry.requestedProducts.map((p, i) => (
                        <Badge key={i} variant="outline">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => setStatus.mutate({ id, status: 'responded' })} disabled={setStatus.isPending}>
              Mark responded
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus.mutate({ id, status: 'ignored' })}
              disabled={setStatus.isPending}
            >
              Ignore
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
