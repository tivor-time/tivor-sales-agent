import { Skeleton } from '@/components/ui/skeleton'

/**
 * Neutral, layout-agnostic route fallback shown during RSC navigation between
 * pages. Deliberately generic (header + one soft panel) so it never reads as the
 * "wrong" specific layout. Full-bleed pages (Inbox, Copilot) override this with
 * their own co-located loading.tsx.
 */
export default function Loading() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
      <div className="space-y-6">
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-[60vh] w-full rounded-xl" />
      </div>
    </div>
  )
}
