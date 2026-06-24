import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'
import { AnalyticsView } from '@/components/analytics/analytics-view'

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Outreach performance, buyer responses, and pipeline distribution in one cockpit.
        </p>
      </div>
      <DegradedBanner />
      <AnalyticsView />
    </PageContainer>
  )
}
