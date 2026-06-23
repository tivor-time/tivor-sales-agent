'use client'

import { useMemo, useState } from 'react'
import { ClipboardCheck, Database, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/loading-skeleton'
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'task' : 'tasks'}
        </span>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="New follow-up… (e.g. chase reply from Müller GmbH)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md"
        />
        <Input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="max-w-[10rem]"
          aria-label="Due date"
        />
        <Button
          size="sm"
          disabled={!title.trim() || create.isPending}
          onClick={() => {
            create.mutate({ title: title.trim(), dueDate: due || undefined })
            setTitle('')
            setDue('')
          }}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {code === 'DB_UNAVAILABLE' ? (
        <EmptyState icon={Database} title="Connect a database" description="Set DATABASE_URL to track follow-ups." />
      ) : isLoading ? (
        <TableSkeleton rows={4} cols={1} />
      ) : isError ? (
        <EmptyState title="Couldn’t load follow-ups" description={(error as Error)?.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No follow-ups"
          description="Add a task to stay on top of buyers — chase replies, schedule check-ins, set recurring nudges."
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {t.leadCompany ? `${t.leadCompany} · ` : ''}
                  {t.dueDate ? (
                    <span className={cn(overdue(t.dueDate) && t.status !== 'done' && 'text-destructive')}>
                      due {new Date(t.dueDate).toLocaleDateString()}
                    </span>
                  ) : (
                    'no due date'
                  )}
                  {t.cadence !== 'once' ? ` · ${t.cadence}` : ''}
                </div>
              </div>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={t.status}
                onChange={(e) => update.mutate({ id: t.id, status: e.target.value as TaskStatus })}
                aria-label="Task status"
              >
                {TASK_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABEL[st]}
                  </option>
                ))}
              </select>
              {t.status !== 'done' && (
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: t.id, status: 'done' })}>
                  Done
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
