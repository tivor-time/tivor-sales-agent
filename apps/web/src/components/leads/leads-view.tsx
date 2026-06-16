'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Users, Database, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/loading-skeleton'
import { useLeads, useUpdateLeadStage, useBulkSetStage, useBulkDeleteLeads } from '@/lib/query/leads'
import { cn } from '@/lib/utils'
import { ImportDialog } from './import-dialog'
import { IcpScore, STAGE_LABELS, LEAD_STAGES } from './stage'

const PAGE_SIZE = 25
type LeadStage = (typeof LEAD_STAGES)[number]

export function LeadsView() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [stages, setStages] = useState<LeadStage[]>([])
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const input = useMemo(
    () => ({
      filters: { search: search || undefined, stage: stages, country: [], source: [], tags: [] },
      pagination: { page, pageSize: PAGE_SIZE },
      sort: { field: 'createdAt' as const, dir: 'desc' as const },
    }),
    [search, stages, page],
  )

  const { data, isLoading, isError, error } = useLeads(input)
  const updateStage = useUpdateLeadStage()
  const bulkStage = useBulkSetStage()
  const bulkDelete = useBulkDeleteLeads()

  const code = (error as { code?: string } | null)?.code
  const rows = data?.rows ?? []
  const pageCount = data?.pageCount ?? 1

  function toggleStageFilter(s: LeadStage) {
    setPage(1)
    setStages((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  }
  const selectedIds = [...selected]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search company or domain…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search leads"
          />
        </div>
        <ImportDialog onImported={() => setSelected(new Set())} />
      </div>

      {/* Stage filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {LEAD_STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStageFilter(s)}
            aria-pressed={stages.includes(s)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              stages.includes(s)
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {STAGE_LABELS[s]}
          </button>
        ))}
        {stages.length > 0 && (
          <button
            type="button"
            onClick={() => setStages([])}
            className="px-2 py-0.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                bulkStage.mutate({ ids: selectedIds, stage: e.target.value as never })
                setSelected(new Set())
              }
              e.currentTarget.value = ''
            }}
          >
            <option value="">Set stage…</option>
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              bulkDelete.mutate({ ids: selectedIds })
              setSelected(new Set())
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      )}

      {/* Body */}
      {code === 'DB_UNAVAILABLE' ? (
        <EmptyState
          icon={Database}
          title="Connect a database to see leads"
          description="Set DATABASE_URL (your Supabase connection string) and run migrations. Until then, leads can't be stored or listed."
        />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <EmptyState title="Couldn’t load leads" description={(error as Error)?.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Import a CSV/XLSX of importer companies to get started."
          action={undefined}
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={selected.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>ICP</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((lead) => (
                  <TableRow key={lead.id} data-state={selected.has(lead.id) ? 'selected' : undefined}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${lead.companyName}`}
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {lead.companyName}
                      </Link>
                      {lead.domain && (
                        <div className="text-xs text-muted-foreground">{lead.domain}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{lead.country ?? '—'}</TableCell>
                    <TableCell>
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        value={lead.stage}
                        onChange={(e) =>
                          updateStage.mutate({ id: lead.id, stage: e.target.value as never })
                        }
                        aria-label={`Stage for ${lead.companyName}`}
                      >
                        {LEAD_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <IcpScore score={lead.icpScore} />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(lead.updatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data?.total.toLocaleString()} lead{data?.total === 1 ? '' : 's'} · page {page} of{' '}
              {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
