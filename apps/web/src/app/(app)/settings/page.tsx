import { DegradedBanner } from '@/components/degraded-banner'
import { MailboxesView } from '@/components/mailbox/mailboxes-view'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Connect your Gmail or Microsoft mailbox in one click. Deliverability is handled by your
          provider — no DNS setup required.
        </p>
      </div>
      <DegradedBanner />
      <MailboxesView />
    </div>
  )
}
