import { DegradedBanner } from '@/components/degraded-banner'
import { ApprovalQueue } from '@/components/outreach/approval-queue'

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approval Queue</h1>
        <p className="text-sm text-muted-foreground">
          Review, edit, and approve AI-drafted outreach before anything is queued. Nothing is ever
          sent without approval.
        </p>
      </div>
      <DegradedBanner />
      <ApprovalQueue />
    </div>
  )
}
