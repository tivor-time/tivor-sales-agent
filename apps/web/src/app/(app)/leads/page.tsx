import { Users } from 'lucide-react'
import { DegradedBanner } from '@/components/degraded-banner'
import { EmptyState } from '@/components/empty-state'

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Importer companies, deduped and ICP-scored.
        </p>
      </div>

      <DegradedBanner />

      <EmptyState
        icon={Users}
        title="No leads yet"
        description="CSV/XLSX import with dedupe and ICP scoring lands in Phase 1 — wiring it up next."
      />
    </div>
  )
}
