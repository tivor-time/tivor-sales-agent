import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 dark:from-muted/50 dark:via-muted/30 dark:to-muted/50',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
