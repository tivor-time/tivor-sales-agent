import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-border"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex gap-4 border-b border-border bg-muted/40 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'max-w-[40%]')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

/**
 * Row list placeholder — avatar/icon + two text lines + a trailing chip — matching
 * the new card-list / message-row layouts (inbox, follow-ups, mailboxes, activity).
 * `framed` wraps it in a rounded-xl card; set false inside full-bleed panes (Inbox list).
 */
export function ListSkeleton({ rows = 6, framed = true }: { rows?: number; framed?: boolean }) {
  const items = Array.from({ length: rows }).map((_, r) => (
    <div
      key={r}
      className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0"
    >
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
    </div>
  ))
  if (!framed) {
    return (
      <div aria-busy="true" aria-live="polite">
        {items}
      </div>
    )
  }
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-busy="true"
      aria-live="polite"
    >
      {items}
    </div>
  )
}

/** Single-message reading placeholder — subject, sender, and body lines. */
export function ReadingPaneSkeleton() {
  return (
    <div className="space-y-5 p-5 sm:p-6" aria-busy="true" aria-live="polite">
      <Skeleton className="h-6 w-2/3" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="space-y-2.5 pt-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-[92%]" />
        <Skeleton className="h-3.5 w-[97%]" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-[85%]" />
      </div>
    </div>
  )
}
