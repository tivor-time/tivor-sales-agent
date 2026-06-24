import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  /** Show the dashed card border. Off for full-bleed panes (inbox) so it merges with the bg. */
  bordered?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bordered = true,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        bordered && 'rounded-xl border border-dashed border-border bg-card/40',
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground ring-1 ring-border/60">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        action.href ? (
          <Button className="mt-6" asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button className="mt-6" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  )
}
