import { CardGridSkeleton } from '@/components/loading-skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <CardGridSkeleton />
    </div>
  )
}
