import { DegradedBanner } from '@/components/degraded-banner'
import { MailInboxView } from '@/components/inbox/mail-inbox-view'

export default function InboxPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          All received mail from your connected mailboxes. AI tags buyer intent and ICP fit as it
          triages replies.
        </p>
      </div>
      <DegradedBanner />
      <MailInboxView />
    </div>
  )
}
