'use client'

import { Info } from 'lucide-react'
import { useFlags } from '@/lib/flags-context'

/**
 * Surfaces which capabilities are running in degraded mode (missing provider
 * keys), so the zero-secrets boot is honest about what's off. Renders nothing
 * when everything needed is configured.
 */
export function DegradedBanner() {
  const flags = useFlags()
  const notes: string[] = []
  if (!flags.isDatabaseEnabled) notes.push('No database (DATABASE_URL) - data is unavailable')
  if (!flags.isAuthEnabled) notes.push('Auth off - using a local dev workspace')
  if (!flags.isAiEnabled) notes.push('AI off - manual compose only')

  if (notes.length === 0) return null

  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-xs text-foreground"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <span>
        <span className="font-medium">Dev mode.</span> {notes.join(' | ')}.
      </span>
    </div>
  )
}
