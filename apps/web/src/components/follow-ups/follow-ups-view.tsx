'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Database,
  ListChecks,
  Plus,
  Repeat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { ListSkeleton } from '@/components/loading-skeleton'
import { SectionHeading, StatCard, StatusDot, type StatTone } from '@/components/ui/stat'
import { cn } from '@/lib/utils'
import { useFollowUps, useCreateFollowUp, useUpdateFollowUp } from '@/lib/query/followups'
import { TASK_STATUSES, type TaskStatus, type ListFollowUpsInput } from '@/server/followup/schemas'

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  snoozed: 'Snoozed',
  cancelled: 'Cancelled',
}

// Status → StatusDot tone, mapped to semantic feedback tokens.
const STATUS_TONE: Record<TaskStatus, StatTone> = {
  open: 'primary',
  in_progress: 'warning',
  done: 'success',
  snoozed: 'muted',
  cancelled: 'muted',
}

// Status → Badge variant for the inline status pill.
const STATUS_BADGE: Record<TaskStatus, 'default' | 'secondary' | 'success' | 'warning' | 'outline'> =
  {
    open: 'outline',
    in_progress: 'warning',
    done: 'success',
    snoozed: 'secondary',
    cancelled: 'secondary',
  }

function formatDue(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function FollowUpsView() {
  const [showAll, setShowAll] = useState(false)
  const input: ListFollowUpsInput = useMemo(
    () => ({ status: showAll ? [...TASK_STATUSES] : ['open', 'in_progress', 'snoozed'] }),
    [showAll],
  )
  const { data, isLoading, isError, error } = useFollowUps(input)
  const create = useCreateFollowUp()
  const update = useUpdateFollowUp()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const code = (error as { code?: string } | null)?.code
  const rows = data ?? []

  const overdue = (d: string | null) => !!d && new Date(d).getTime() < Date.now()

  // Counts derived from the rows actually loaded — no invented data.
  const counts = useMemo(() => {
    let active = 0
    let done = 0
    let overdueCount = 0
    for (const t of rows) {
      const open = t.status !== 'done' && t.status !== 'cancelled'
      if (open) active += 1
      if (t.status === 'done') done += 1
      if (open && overdue(t.dueDate)) overdueCount += 1
    }
    return { active, done, overdue: overdueCount }
  }, [rows])

  function submit() {
    if (!title.trim() || create.isPending) return
    create.mutate({ title: title.trim(), dueDate: due || undefined })
    setTitle('')
    setDue('')
  }

  const showStats = !isLoading && !isError && code !== 'DB_UNAVAILABLE' && rows.length > 0

  return (
    <div className="space-y-5">
      {/* KPI strip — real, derived counts only */}
      {showStats ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={ListChecks}
            tone="primary"
            label={showAll ? 'Total tasks' : 'Active tasks'}
            value={counts.active.toString().padStart(2, '0')}
            footer={showAll ? 'Across all statuses' : 'Open, in progress & snoozed'}
          />
          <StatCard
            icon={AlertTriangle}
            tone={counts.overdue > 0 ? 'destructive' : 'muted'}
            label="Overdue"
            value={counts.overdue.toString().padStart(2, '0')}
            footer={counts.overdue > 0 ? 'Past due — needs attention' : 'Nothing past due'}
          />
          <StatCard
            icon={CheckCircle2}
            tone="success"
            label="Completed"
            value={counts.done.toString().padStart(2, '0')}
            footer={showAll ? 'Marked done' : 'Toggle “all statuses” to see done'}
          />
        </div>
      ) : null}

      {/* Composer */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <SectionHeading icon={Plus}>New follow-up</SectionHeading>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            placeholder="e.g. Chase reply from Müller GmbH"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            className="min-w-[16rem] flex-1"
            aria-label="Follow-up title"
          />
          <div className="relative">
            <CalendarClock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-[11rem] pl-8 tabular-nums"
              aria-label="Due date"
            />
          </div>
          <Button size="default" disabled={!title.trim() || create.isPending} onClick={submit}>
            <Plus className="h-4 w-4" /> Add task
          </Button>
        </div>
      </div>

      {/* Toolbar: count + filter */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          <span className="font-mono font-medium tabular-nums text-foreground">{rows.length}</span>{' '}
          {rows.length === 1 ? 'task' : 'tasks'}
        </span>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-pressed={showAll}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            showAll
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {showAll ? 'Showing all statuses' : 'Active only'}
        </button>
      </div>

      {/* Body */}
      {code === 'DB_UNAVAILABLE' ? (
        <EmptyState
          icon={Database}
          title="Connect a database"
          description="Set DATABASE_URL to track follow-ups."
        />
      ) : isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <EmptyState title="Couldn’t load follow-ups" description={(error as Error)?.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No follow-ups"
          description="Add a task to stay on top of buyers — chase replies, schedule check-ins, set recurring nudges."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {rows.map((t) => {
              const isOverdue = overdue(t.dueDate) && t.status !== 'done' && t.status !== 'cancelled'
              const isDone = t.status === 'done'
              return (
                <div
                  key={t.id}
                  className="group flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  {/* Status dot */}
                  <StatusDot
                    tone={STATUS_TONE[t.status]}
                    pulse={t.status === 'in_progress'}
                    className="shrink-0"
                  />

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'truncate text-sm font-medium text-foreground',
                          isDone && 'text-muted-foreground line-through',
                        )}
                      >
                        {t.title}
                      </span>
                      <Badge
                        variant={STATUS_BADGE[t.status]}
                        className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      >
                        {STATUS_LABEL[t.status]}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {t.leadCompany ? (
                        <>
                          <span className="truncate text-foreground/80">{t.leadCompany}</span>
                          <span aria-hidden className="text-border">
                            ·
                          </span>
                        </>
                      ) : null}
                      {t.dueDate ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1',
                            isOverdue && 'font-medium text-destructive',
                          )}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <CalendarClock className="h-3.5 w-3.5" />
                          )}
                          {isOverdue ? 'Overdue · ' : 'Due '}
                          <span className="font-mono tabular-nums">{formatDue(t.dueDate)}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70">No due date</span>
                      )}
                      {t.cadence !== 'once' ? (
                        <>
                          <span aria-hidden className="text-border">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 capitalize">
                            <Repeat className="h-3.5 w-3.5" />
                            {t.cadence}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="relative">
                      <select
                        className="h-8 cursor-pointer appearance-none rounded-md border border-input bg-background py-0 pl-2.5 pr-7 text-xs font-medium text-foreground transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                        value={t.status}
                        onChange={(e) =>
                          update.mutate({ id: t.id, status: e.target.value as TaskStatus })
                        }
                        aria-label={`Status for ${t.title}`}
                      >
                        {TASK_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {STATUS_LABEL[st]}
                          </option>
                        ))}
                      </select>
                      <svg
                        aria-hidden
                        viewBox="0 0 12 12"
                        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
                      >
                        <path
                          d="M3 4.5 6 7.5 9 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    {!isDone && t.status !== 'cancelled' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => update.mutate({ id: t.id, status: 'done' })}
                        aria-label={`Mark ${t.title} done`}
                      >
                        <Check className="h-4 w-4" /> Done
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
