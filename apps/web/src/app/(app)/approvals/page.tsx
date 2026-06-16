import { ClipboardCheck } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function ApprovalsPage() {
  return (
    <ComingSoon
      title="Approval Queue"
      phase="Phase 2"
      icon={ClipboardCheck}
      description="Review, edit, and bulk-approve outreach before anything is ever queued to send."
    />
  )
}
