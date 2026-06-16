import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'

export function ComingSoon({
  title,
  phase,
  icon,
  description,
}: {
  title: string
  phase: string
  icon?: LucideIcon
  description?: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">Planned for {phase}.</p>
      </div>
      <EmptyState
        icon={icon}
        title={`${title} is coming in ${phase}`}
        description={description ?? 'This area is part of an upcoming build phase.'}
      />
    </div>
  )
}
