import { ListChecks } from 'lucide-react'
import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'
import { FollowUpsView } from '@/components/follow-ups/follow-ups-view'

export default function FollowUpsPage() {
  return (
    <PageContainer>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-5 w-5" />
        </div>
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
