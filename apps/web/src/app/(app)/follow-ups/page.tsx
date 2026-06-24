import { DegradedBanner } from '@/components/degraded-banner'
import { FollowUpsView } from '@/components/follow-ups/follow-ups-view'

export default function FollowUpsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">
          Stay on top of buyers — chase replies, schedule check-ins, and set recurring nudges so
          nothing slips.
        </p>
      </div>
      <DegradedBanner />
      <FollowUpsView />
    </div>
  )
}
