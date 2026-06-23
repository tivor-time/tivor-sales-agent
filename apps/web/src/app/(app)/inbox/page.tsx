import { DegradedBanner } from '@/components/degraded-banner'
import { InboxView } from '@/components/inbox/inbox-view'

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Inbound buyer inquiries, classified by intent and BANT. Reply, ignore, or jump to the lead.
        </p>
      </div>
      <DegradedBanner />
      <InboxView />
    </div>
  )
}
