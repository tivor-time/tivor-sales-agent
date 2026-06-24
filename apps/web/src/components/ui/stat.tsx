import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

/**
 * Enterprise stat/metric kit — the premium "Kombai-grade" building blocks reused
 * across dashboards and analytics. Everything is theme-safe (semantic tokens only)
 * and numerics render in the mono face via `font-mono` for an industry feel.
 */

export type StatTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'sky'
  | 'violet'
  | 'muted'

// Full literal class strings (no interpolation) so Tailwind's JIT keeps them.
const TINT: Record<StatTone, string> = {
  primary: 'bg-primary/10 text-primary ring-primary/20',
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
  sky: 'bg-chart-2/10 text-chart-2 ring-chart-2/20',
  violet: 'bg-chart-5/10 text-chart-5 ring-chart-5/20',
  muted: 'bg-muted text-muted-foreground ring-border',
}

const ICON_COLOR: Record<StatTone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  sky: 'text-chart-2',
  violet: 'text-chart-5',
  muted: 'text-muted-foreground',
}

const BAR: Record<StatTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  sky: 'bg-chart-2',
  violet: 'bg-chart-5',
  muted: 'bg-muted-foreground',
}

const DELTA: Record<'up' | 'down' | 'neutral', string> = {
  up: 'bg-success/10 text-success',
  down: 'bg-destructive/10 text-destructive',
  neutral: 'bg-muted text-muted-foreground',
}

/** Tinted icon square with a hairline inset ring. */
export function IconTile({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  className,
}: {
  icon: LucideIcon
  tone?: StatTone
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const box = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
  const ic = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-lg ring-1 ring-inset',
        box,
        TINT[tone],
        className,
      )}
    >
      <Icon className={ic} />
    </span>
  )
}

/** Premium KPI card: icon tile, uppercase label, optional mono delta pill, big mono value, optional footer. */
export function StatCard({
  icon,
  label,
  value,
  tone = 'primary',
  delta,
  deltaDirection = 'neutral',
  footer,
  className,
}: {
  icon?: LucideIcon
  label: string
  value: React.ReactNode
  tone?: StatTone
  delta?: React.ReactNode
  deltaDirection?: 'up' | 'down' | 'neutral'
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? <IconTile icon={icon} tone={tone} /> : null}
          <span className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        {delta != null ? (
          <span
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium',
              DELTA[deltaDirection],
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      <div className="relative mt-3 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      {footer != null ? (
        <div className="relative mt-1.5 text-xs text-muted-foreground">{footer}</div>
      ) : null}
    </Card>
  )
}

/** Uppercase, tracked section heading with an optional leading icon and trailing action. */
export function SectionHeading({
  icon: Icon,
  iconTone = 'primary',
  children,
  action,
  className,
}: {
  icon?: LucideIcon
  iconTone?: StatTone
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className={cn('h-4 w-4', ICON_COLOR[iconTone])} /> : null}
        {children}
      </h2>
      {action}
    </div>
  )
}

/** Slim progress bar on a muted track. */
export function MiniProgress({
  value,
  tone = 'primary',
  className,
}: {
  value: number
  tone?: StatTone
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full', BAR[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Small status dot, optionally pulsing. */
export function StatusDot({
  tone = 'success',
  pulse = false,
  className,
}: {
  tone?: StatTone
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-1.5 w-1.5 rounded-full', BAR[tone], pulse && 'animate-pulse', className)}
    />
  )
}
