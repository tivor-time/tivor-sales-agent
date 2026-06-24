import { DegradedBanner } from '@/components/degraded-banner'
import { AnalyticsView } from '@/components/analytics/analytics-view'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Outreach performance, buyer responses, and pipeline distribution in one cockpit.
        </p>
      </div>
      <DegradedBanner />
      <AnalyticsView />
    </div>
  )
}
