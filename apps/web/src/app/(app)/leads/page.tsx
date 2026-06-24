import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'
import { LeadsView } from '@/components/leads/leads-view'

export default function LeadsPage() {
  return (
    <PageContainer>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">Importer companies, deduped and ICP-scored.</p>
      </div>
      <DegradedBanner />
      <LeadsView />
    </PageContainer>
  )
}
