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

/**
 * Token-based tone per pipeline stage. Each entry maps to a soft tinted treatment
 * (dot + pill) built from semantic tokens so it reads correctly in both themes.
 * Early stages stay neutral/brand; mid-pipeline warms; terminal stages use feedback tokens.
 */
const STAGE_TONE: Record<
  string,
  { dot: string; pill: string }
> = {
  new: {
    dot: 'bg-muted-foreground/50',
    pill: 'bg-muted text-muted-foreground',
  },
  researching: {
    dot: 'bg-muted-foreground/60',
    pill: 'bg-muted text-muted-foreground',
  },
  qualified: {
    dot: 'bg-primary',
    pill: 'bg-primary/10 text-primary',
  },
  contacted: {
    dot: 'bg-primary',
    pill: 'bg-primary/10 text-primary',
  },
  engaged: {
    dot: 'bg-primary',
    pill: 'bg-primary/15 text-primary',
  },
  negotiating: {
    dot: 'bg-warning',
    pill: 'bg-warning/15 text-warning',
  },
  won: {
    dot: 'bg-success',
    pill: 'bg-success/15 text-success',
  },
  lost: {
    dot: 'bg-destructive',
    pill: 'bg-destructive/15 text-destructive',
  },
  disqualified: {
    dot: 'bg-destructive/70',
    pill: 'bg-destructive/10 text-destructive',
  },
}

const FALLBACK_TONE = { dot: 'bg-muted-foreground/50', pill: 'bg-muted text-muted-foreground' }

/** Standalone dot indicator — pair with a label in tables/selects. */
export function StageDot({ stage, className }: { stage: string; className?: string }) {
  const tone = STAGE_TONE[stage] ?? FALLBACK_TONE
  return <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot, className)} aria-hidden />
}

/** Soft pill with a leading dot — the primary stage indicator. */
export function StagePill({ stage, className }: { stage: string; className?: string }) {
  const tone = STAGE_TONE[stage] ?? FALLBACK_TONE
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tone.pill,
        className,
      )}
    >
      <StageDot stage={stage} />
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
}

export function StageBadge({ stage }: { stage: string }) {
  return <Badge variant={STAGE_VARIANT[stage] ?? 'outline'}>{STAGE_LABELS[stage] ?? stage}</Badge>
}

export function IcpScore({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>
  const tone = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-muted-foreground/60'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="tabular-nums text-xs font-medium text-foreground/80">{score}</span>
    </div>
  )
}

export { LEAD_STAGES }
