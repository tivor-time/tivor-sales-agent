import { cn } from '@/lib/utils'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { LEAD_STAGES } from '@/server/leads/schemas'

export const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  researching: 'Researching',
  qualified: 'Qualified',
  contacted: 'Contacted',
  engaged: 'Engaged',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
  disqualified: 'Disqualified',
}

const STAGE_VARIANT: Record<string, BadgeProps['variant']> = {
  new: 'secondary',
  researching: 'secondary',
  qualified: 'default',
  contacted: 'default',
  engaged: 'default',
  negotiating: 'warning',
  won: 'success',
  lost: 'destructive',
  disqualified: 'destructive',
}

export function StageBadge({ stage }: { stage: string }) {
  return <Badge variant={STAGE_VARIANT[stage] ?? 'outline'}>{STAGE_LABELS[stage] ?? stage}</Badge>
}

export function IcpScore({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>
  const tone = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-muted-foreground'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="tabular-nums text-xs">{score}</span>
    </div>
  )
}

export { LEAD_STAGES }
