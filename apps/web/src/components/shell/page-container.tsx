import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Standard content-page wrapper: owns the vertical scroll for the page and uses
 * the FULL width of the content area (no centered max-width box) so screens like
 * Leads, Analytics and Follow-ups get real reading space. Workspace screens
 * (Inbox, Copilot) skip this and fill the region edge-to-edge themselves.
 */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className={cn('space-y-6 px-4 py-6 sm:px-6 lg:px-8', className)}>{children}</div>
    </div>
  )
}
