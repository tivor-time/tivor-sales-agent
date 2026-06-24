import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'
import { ApprovalQueue } from '@/components/outreach/approval-queue'

export default function ApprovalsPage() {
  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review, edit, and approve AI-drafted outreach before anything is queued. Nothing is ever
          sent without approval.
        </p>
      </div>
      <DegradedBanner />
      <ApprovalQueue />
    </PageContainer>
  )
}
