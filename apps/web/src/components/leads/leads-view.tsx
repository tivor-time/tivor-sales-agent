'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Users, Database, Trash2, ChevronRight, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/ui/stat'
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
import { GenerateOutreachDialog } from '@/components/outreach/generate-dialog'
import { IcpScore, StageDot, STAGE_LABELS, LEAD_STAGES } from './stage'

const PAGE_SIZE = 25
type LeadStage = (typeof LEAD_STAGES)[number]

const SELECT_CLASS =
  'h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground ring-offset-background transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

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
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search company or domain…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search leads"
          />
        </div>
        <ImportDialog onImported={() => setSelected(new Set())} />
      </div>

      {/* Stage filter */}
      <SectionHeading
        icon={Filter}
        action={
          data && !isLoading ? (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {data.total.toLocaleString()} total
            </span>
          ) : undefined
        }
      >
        Filter by stage
      </SectionHeading>
      <div className="flex flex-wrap items-center gap-1.5">
        {LEAD_STAGES.map((s) => {
          const active = stages.includes(s)
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStageFilter(s)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <StageDot stage={s} className={cn(!active && 'opacity-70')} />
              {STAGE_LABELS[s]}
            </button>
          )
        })}
        {stages.length > 0 && (
          <button
            type="button"
            onClick={() => setStages([])}
            className="ml-1 px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
          <span className="font-medium">
            <span className="font-mono tabular-nums">{selectedIds.length}</span> selected
          </span>
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />
          <select
            className={SELECT_CLASS}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                bulkStage.mutate({ ids: selectedIds, stage: e.target.value as never })
                setSelected(new Set())
              }
              e.currentTarget.value = ''
            }}
            aria-label="Set stage for selected leads"
          >
            <option value="">Set stage…</option>
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <GenerateOutreachDialog leadIds={selectedIds} onDone={() => setSelected(new Set())} />
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
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear selection
          </button>
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
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="h-3.5 w-3.5 cursor-pointer accent-primary"
                      checked={selected.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="uppercase tracking-wide">Company</TableHead>
                  <TableHead className="uppercase tracking-wide">Country</TableHead>
                  <TableHead className="uppercase tracking-wide">Stage</TableHead>
                  <TableHead className="uppercase tracking-wide">ICP</TableHead>
                  <TableHead className="pr-4 text-right uppercase tracking-wide">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((lead) => (
                  <TableRow
                    key={lead.id}
                    data-state={selected.has(lead.id) ? 'selected' : undefined}
                    className="group"
                  >
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${lead.companyName}`}
                        className="h-3.5 w-3.5 cursor-pointer accent-primary"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="inline-flex items-center gap-1 truncate font-medium text-foreground transition-colors hover:text-primary"
                      >
                        <span className="truncate">{lead.companyName}</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                      {lead.domain && (
                        <div className="truncate text-xs text-muted-foreground">{lead.domain}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.country ?? '—'}</TableCell>
                    <TableCell>
                      <div className="relative inline-flex items-center">
                        <StageDot stage={lead.stage} className="pointer-events-none absolute left-2.5" />
                        <select
                          className={cn(SELECT_CLASS, 'pl-6')}
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
                      </div>
                    </TableCell>
                    <TableCell>
                      <IcpScore score={lead.icpScore} />
                    </TableCell>
                    <TableCell className="pr-4 text-right font-mono text-xs tabular-nums text-muted-foreground">
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
              <span className="font-mono tabular-nums text-foreground/80">
                {data?.total.toLocaleString()}
              </span>{' '}
              lead{data?.total === 1 ? '' : 's'} · page{' '}
              <span className="font-mono tabular-nums text-foreground/80">{page}</span> of{' '}
              <span className="font-mono tabular-nums text-foreground/80">{pageCount}</span>
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
