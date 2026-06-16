import { Inbox } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function InboxPage() {
  return (
    <ComingSoon
      title="Inbox"
      phase="Phase 4"
      icon={Inbox}
      description="Inbound inquiry triage: classify intent, draft catalog-grounded replies, flag hot leads."
    />
  )
}
