import { ListChecks } from 'lucide-react'
import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'
import { IconTile } from '@/components/ui/stat'
import { FollowUpsView } from '@/components/follow-ups/follow-ups-view'

export default function FollowUpsPage() {
  return (
    <PageContainer>
      <div className="flex items-start gap-3">
        <IconTile icon={ListChecks} tone="primary" size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Stay on top of buyers — chase replies, schedule check-ins, and set recurring nudges so
            nothing slips.
          </p>
        </div>
      </div>
      <DegradedBanner />
      <FollowUpsView />
    </PageContainer>
  )
}
