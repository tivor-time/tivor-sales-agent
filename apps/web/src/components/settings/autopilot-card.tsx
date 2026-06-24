'use client'

import { CalendarClock, Rocket, ShieldCheck, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAutopilot, useSetAutopilot } from '@/lib/query/settings'

const HIGHLIGHTS = [
  { icon: Send, label: 'Auto-sends the first email — no approval queue' },
  { icon: CalendarClock, label: 'Schedules the Day 3 / 7 / 14 follow-ups for you' },
  { icon: ShieldCheck, label: 'High-spam-risk drafts still wait for your review' },
]

export function AutopilotCard() {
  const { data, isLoading } = useAutopilot()
  const setAuto = useSetAutopilot()
  const enabled = !!data?.enabled
  const busy = isLoading || setAuto.isPending

  return (
    <Card className={cn('transition-colors', enabled && 'border-primary/40 bg-primary/[0.04]')}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors',
              enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <Rocket className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold leading-none tracking-tight">Autopilot</h2>
              <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'On' : 'Off'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Let the AI run new campaigns end-to-end — sending and follow-ups, hands-free.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle autopilot"
          disabled={busy}
          onClick={() => setAuto.mutate({ enabled: !enabled })}
          className={cn(
            'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
            'disabled:cursor-not-allowed disabled:opacity-50',
            enabled ? 'bg-primary' : 'bg-input',
          )}
        >
          <span
            className={cn(
              'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
              enabled && 'translate-x-5',
            )}
          />
        </button>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2.5"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs leading-snug text-foreground/80">{label}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Requires a connected mailbox with sending on, plus the worker running.
        </p>
      </CardContent>
    </Card>
  )
}
