'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { useInquiry, useSetInquiryStatus } from '@/lib/query/inquiries'

export function InquiryDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading, isError, error } = useInquiry(id)
  const setStatus = useSetInquiryStatus()
  const code = (error as { code?: string } | null)?.code

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
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
            <h2 className="text-lg font-semibold">{data.message?.subject ?? '(no subject)'}</h2>
            <Badge variant="secondary">{data.inquiry.intent}</Badge>
            <Badge variant="outline">{data.inquiry.status}</Badge>
            {data.lead && (
              <Button variant="link" size="sm" asChild className="ml-auto">
                <Link href={`/leads/${data.lead.id}`}>{data.lead.companyName} →</Link>
              </Button>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                From {data.message?.fromAddress ?? 'unknown'}
                {data.message?.receivedAt ? ` · ${new Date(data.message.receivedAt).toLocaleString()}` : ''}
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-3 text-sm">
                {data.message?.bodyText || '(no content)'}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">AI classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.inquiry.icpScore != null && (
                <div>
                  <div className="text-3xl font-semibold tabular-nums">{data.inquiry.icpScore}</div>
                  <div className="text-xs text-muted-foreground">ICP score</div>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    ['Budget', data.inquiry.budget],
                    ['Authority', data.inquiry.authority],
                    ['Need', data.inquiry.need],
                    ['Timeline', data.inquiry.timeline],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd>{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
              {data.inquiry.requestedProducts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.inquiry.requestedProducts.map((p, i) => (
                    <Badge key={i} variant="outline">
                      {p}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
