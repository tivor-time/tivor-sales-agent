import { ListSkeleton } from '@/components/loading-skeleton'

/** Full-bleed two-pane placeholder matching the Inbox layout (no boxed wrappers). */
export default function Loading() {
  return (
    <div className="grid h-full lg:grid-cols-[400px_1fr]">
      <div className="border-r">
        <div className="space-y-3 border-b px-4 py-3">
          <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        </div>
        <ListSkeleton rows={8} framed={false} />
      </div>
      <div className="hidden lg:block" />
    </div>
  )
}
