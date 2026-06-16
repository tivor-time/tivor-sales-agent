import { DegradedBanner } from '@/components/degraded-banner'
import { LeadsView } from '@/components/leads/leads-view'

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
      <LeadsView />
    </div>
  )
}
